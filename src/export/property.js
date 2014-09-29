﻿function getProperty(data, split, isColor) {
    if (!data instanceof Property) return null;

    if (data.numKeys < 1) {
        return getStaticProperty(data, split, isColor);
    } else {
        return getAnimatedProperty(data, split, isColor);
    }
}

function getStaticProperty(data, split, isColor) {

    var arr = [];

    if (data.value instanceof Array && typeof split === 'number') {
        arr.push({
            t: 0,
            v: data.value[split]
        });
    } else {
        arr.push({
            t: 0,
            v: data.value
        });
    }

    return arr;
}

function getAnimatedProperty(data, split, isColor) {
    return normalizeKeyframes(getKeyframes(data, split, isColor), split, isColor);
}

function getKeyframes(data, split, isColor) {

    var arr = [],
        numKeys = data.numKeys;

    for (var i = 1; i <= numKeys; i++) {

        var obj = {},
            inType,
            outType,
            easeIn,
            easeOut;

        obj.t = data.keyTime(i) * 1000;

        inType = data.keyInInterpolationType(i);
        outType = data.keyOutInterpolationType(i);

        if (typeof split === 'number' && data.keyInTemporalEase(i)[split] && data.keyOutTemporalEase(i)[split]) {
            easeIn = data.keyInTemporalEase(i)[split];
            easeOut = data.keyOutTemporalEase(i)[split];
        } else {
            //anchor needs split, but has no second keyframeobject
            easeIn = data.keyInTemporalEase(i)[0];
            easeOut = data.keyOutTemporalEase(i)[0];
        }

        if (typeof split === 'number') {
            obj.v = data.keyValue(i)[split || 0];
        } else {
            obj.v = data.keyValue(i);
        }

        if (i > 1 && inType !== KeyframeInterpolationType.HOLD) {
            obj.easeIn = [];
            obj.easeIn[0] = easeIn.influence;
            obj.easeIn[1] = easeIn.speed;
        }

        if (i < numKeys && outType !== KeyframeInterpolationType.HOLD) {
            obj.easeOut = [];
            obj.easeOut[0] = easeOut.influence;
            obj.easeOut[1] = easeOut.speed;
        }

        //FIXME buggy if no easing set
//        position
        if (typeof split === 'number' &&
            (data.propertyValueType === PropertyValueType.TwoD_SPATIAL || data.propertyValueType === PropertyValueType.ThreeD_SPATIAL)) {

            if (i > 1) {
                obj.inTangent = data.keyInSpatialTangent(i)[split];
                obj.easeIn = [];
                obj.easeIn[0] = easeIn.influence;
                obj.easeIn[1] = easeIn.speed;
            }

            if (i < numKeys) {
                obj.outTangent = data.keyOutSpatialTangent(i)[split];
                obj.easeOut = [];
                obj.easeOut[0] = easeOut.influence;
                obj.easeOut[1] = easeOut.speed;
            }
        }

        arr.push(obj);
    }

    return arr;
}

function normalizeKeyframes(frames, split, isColor) {

    for (var i = 1; i < frames.length; i++) {

        var lastKey = frames[i - 1],
            key = frames[i],
            duration = key.t - lastKey.t,
            diff,
            easeOut, easeIn,
            normInfluenceIn, normSpeedIn,
            normInfluenceOut, normSpeedOut,
            x, y, z,
            ratio;

        // multidimensional properties, fill array has 4 fields. dont need last one
        if (key.v instanceof Array && key.v.length > 2) {
            x = key.v[0] - lastKey.v[0];
            y = key.v[1] - lastKey.v[1];
            z = key.v[2] - lastKey.v[2];
            diff = Math.pow(x * x + y * y + z * z, 1 / 3);
            $.writeln(diff);
        } else if (key.v instanceof Array && key.v.length === 2) {
            x = key.v[0] - lastKey.v[0];
            y = key.v[1] - lastKey.v[1];
            diff = Math.sqrt(x * x + y * y);
        } else {
            diff = key.v - lastKey.v;
        }

        //FIXME hackiest shit ever :)
        // fix problem if lastKey.v === key.v, but has easing
        //TODO use modulo
        if (diff < 0.01 && diff > -0.01) {
            diff = 0.01;
            if (key.v instanceof Array) {
                for (var j = 0; j < key.v.length; j++) {
                    key.v[j] = lastKey.v[j] + 0.01;
                }
            } else {
                key.v = lastKey.v + 0.01;
            }
        }
        
        var colorOffset = 1;
        if (isColor) colorOffset = 255;
        var averageTempo = diff * colorOffset / duration * 1000;

        if (key.easeIn) {
            normInfluenceIn = key.easeIn[0] / 100;
            normSpeedIn = key.easeIn[1] / averageTempo * normInfluenceIn;
            easeIn = [];
            easeIn[0] = Math.round((1 - normInfluenceIn) * 1000) / 1000;
            easeIn[1] = Math.round((1 - normSpeedIn) * 1000) / 1000;
            key.easeIn = easeIn;
        }

        if (lastKey.easeOut) {
            normInfluenceOut = lastKey.easeOut[0] / 100;
            normSpeedOut = lastKey.easeOut[1] / averageTempo * normInfluenceOut;
            easeOut = [];
            easeOut[0] = Math.round(normInfluenceOut * 1000) / 1000;
            easeOut[1] = Math.round(normSpeedOut * 1000) / 1000;
            lastKey.easeOut = easeOut;
        }

        //set default values
        if (lastKey.easeOut && !key.easeIn) {
            key.easeIn = [0.16667, 1];
        } else if (key.easeIn && !lastKey.easeOut) {
            lastKey.easeOut = [0.16667, 0];
        }
    }

    return frames;
}