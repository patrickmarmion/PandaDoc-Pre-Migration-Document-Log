const status429 = async (errorDetail, retries) => {
    let splitString = errorDetail.split(" ");
    let throttleDelay = parseInt(splitString[splitString.length - 2], 10) * 1000;
    console.log(`Received throttling error, retrying in ${throttleDelay} miliseconds... (attempt ${retries + 1} of 3)`);
    await delay(throttleDelay + 3000);
    return throttleDelay
};




const delay = ms => {
    return new Promise(resolve => setTimeout(resolve, ms))
};


module.exports = status429;