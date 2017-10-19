
function rainbow() {

    // 30 random hues with step of 12 degrees
    var hue = Math.floor(Math.random() * 30) * 12;

    return $.Color({
        hue: hue,
        saturation: 0.9,
        lightness: 0.7,
        alpha: 1
    }).toHexString();
};