const { spawn } = require("child_process");

/**
 *
 * @returns {Promise<boolean>}
 */
const ffmpegSupport = () => {
  return new Promise((resolve) => {
    const cmd = spawn("ffmpeg", ["-h"]);
    cmd.on("error", (err) => {
      console.log(`[Error FFMPEG] ${err.toString()}`);
      resolve(false);
    });
    cmd.on("close", (code) => {
      if (code != 0) resolve(false);
      resolve(true);
    });
  });
};

/**
 *
 * @returns {Promise<boolean>}
 */
const imagemagickConvertSupport = () => {
  return new Promise((resolve) => {
    const cmd = spawn("convert", ["-help"]);
    cmd.on("error", (err) => {
      console.log(`[Error FFMPEG] ${err.toString()}`);
      resolve(false);
    });
    cmd.on("close", (code) => {
      if (code != 0) resolve(false);
      resolve(true);
    });
  });
};

module.exports = { ffmpegSupport, imagemagickConvertSupport };
