import * as electron from 'electron';
import {Curl} from 'insomnia-node-libcurl';
import uuid from 'uuid';
import autobind from 'autobind-decorator';

@autobind
class CurlClient {
  constructor (responseBodyPath) {
    this._responseBodyPath = responseBodyPath;
    this._opts = [];
    this._callbacks = {
      [Curl.option.DEBUGFUNCTION]: null,
      'end': null,
      'error': null
    };

    electron.ipcRenderer.on('curl.callback', this._handleCallback);
  }

  static getVersion () {
    return Curl.getVersion();
  }

  SPECIALGetBytesRead () {
    return this._send('SPECIALGetBytesRead');
  }

  async close () {
    return this._send('close');
  }

  async perform () {
    await this._send('SPECIALSetOpts', this._opts);
    return this._send('perform');
  }

  async getInfo (opt) {
    return this._send('getInfo', opt);
  }

  setOpt (opt, ...args) {
    if (opt === Curl.option.DEBUGFUNCTION) {
      this._callbacks[Curl.option.DEBUGFUNCTION] = args[0];
    } else {
      this._send('setOpt', opt, ...args);
    }
  }

  enable (...args) {
    this._send('enable', ...args);
  }

  on (event, callback) {
    this._callbacks[event] = callback;
  }

  _handleCallback (e, name, ...args) {
    if (!this._callbacks[name]) {
      return;
    }

    if (name === 'end' || name === 'error') {
      electron.ipcRenderer.removeListener('curl.callback', this._handleCallback);
    }

    this._callbacks[name](...args);
  }

  async _send (fnName, ...args) {
    return new Promise(resolve => {
      const replyChannel = `curl.fn.reply:${uuid.v4()}`;
      electron.ipcRenderer.send('curl.fn', this._responseBodyPath, fnName, replyChannel, ...args);
      electron.ipcRenderer.once(replyChannel, (e, result) => {
        resolve(result);
      });
    });
  }
}

CurlClient.option = Curl.option;
CurlClient.feature = Curl.feature;
CurlClient.auth = Curl.auth;
CurlClient.netrc = Curl.netrc;
CurlClient.info = Curl.info;
CurlClient.code = Curl.code;

export default CurlClient;
