// @flow
import fs from 'fs';
import {Curl} from 'insomnia-node-libcurl';
import * as electron from 'electron';
import {waitForStreamToFinish} from '../../common/misc';

export function init () {
  electron.ipcMain.on('curl.fn', async (e, id, fnName, replyChannel, ...args) => {
    const curl = _getHandle(id);

    let result = null;
    if (fnName === 'SPECIALGetBytesRead') {
      result = curl._bytesRead;
    } else if (fnName === 'SPECIALSetOpts') {
      for (const arg of args[0]) {
        curl.setOpt(arg.opt, ...arg.args);
      }
    } else if (curl[fnName]) {
      result = curl[fnName](...args);
    } else if (fnName === 'close') {
      await waitForStreamToFinish(refs[id]._writeStream);
      try {
        curl.close();
      } catch (err) {
        // Probably closed already
      }
    } else {
      throw new Error(`Failed to call Curl function ${fnName}`);
    }

    e.sender.send(replyChannel, result);
  });
}

const refs = {};

function _getHandle (responseBodyPath: string) {
  if (refs[responseBodyPath]) {
    return refs[responseBodyPath];
  }

  const curl: Object = new Curl();
  refs[responseBodyPath] = curl;

  // Handle the debug function
  curl.setOpt(Curl.option.DEBUGFUNCTION, (...args) => {
    for (const w of electron.BrowserWindow.getAllWindows()) {
      w.send('curl.callback', Curl.option.DEBUGFUNCTION, ...args);
    }
    return 0;
  });

  // Handle writing the response body
  curl._writeStream = fs.createWriteStream(responseBodyPath);
  curl._bytesRead = 0;
  curl.on('end', () => curl._writeStream.end());
  curl.on('error', () => curl._writeStream.end());
  curl.setOpt(Curl.option.WRITEFUNCTION, (buff: Buffer) => {
    curl._bytesRead += buff.length;
    curl._writeStream.write(buff);
    return buff.length;
  });

  curl.on('end', (...args) => {
    for (const w of electron.BrowserWindow.getAllWindows()) {
      w.send('curl.callback', 'end', ...args);
    }
  });

  curl.on('error', (...args) => {
    for (const w of electron.BrowserWindow.getAllWindows()) {
      w.send('curl.callback', 'error', ...args);
    }
  });

  return curl;
}
