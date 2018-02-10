import React, {PureComponent} from 'react';
import {EventEmitter} from 'events';
import PropTypes from 'prop-types';
import autobind from 'autobind-decorator';
import contextMenu from 'electron-context-menu';
import nunjucks from 'nunjucks';
import {remote} from 'electron';
import CodeEditor from '../codemirror/code-editor';
import * as models from '../../../models';

@autobind
class TemplateView extends PureComponent {
  _handleSetWebviewRef (n) {
    this._webview = n;
    if (n) {
      contextMenu({window: this._webview});
    }
  }

  _handleDOMReady () {
    this._webview.removeEventListener('dom-ready', this._handleDOMReady);
    this._setBody();
    this._onTemplateChange(this.props.request.template);
  }

  _setBody(){
    // This is kind of hacky but electron-context-menu fails to save images if
    // this isn't here.
    this._webview.webContents = this._webview;
    this._webview.webContents.session = new EventEmitter();
  }

  componentDidUpdate () {
    this._setBody();
  }

  componentDidMount () {
    this._webview.addEventListener('dom-ready', this._handleDOMReady);
  }

  _handleOpenLink (link: string) {
    shell.openExternal(link);
  }

  _onTemplateChange(template){
    // get values
    const {data} = this.props;

    // run rendering engine
    try{
      let rendered = nunjucks.renderString(template, {"response": JSON.parse(data)});
      this._webview.loadURL(`data:text/html,${encodeURIComponent(rendered)}`);
    } catch (err) {
      this._webview.loadURL(`data:text/html,`);
    }

    // save new template
    models.request.update(this.props.request, {template});
  }

  render () {
    const {
      bytes,
      download,
      editorFontSize,
      editorIndentSize,
      editorKeyMap,
      editorLineWrapping,
      error: responseError,
      filter,
      filterHistory,
      previewMode,
      responseId,
      updateFilter,
      url,
      request
    } = this.props;

    return (
      <span>
        <webview style={{height: "50%"}} ref={this._handleSetWebviewRef} src="about:blank"></webview>
        <CodeEditor
          defaultValue={request.template}
          updateFilter={updateFilter}
          filter={filter}
          filterHistory={filterHistory}
          autoPrettify
          noMatchBrackets
          mode="text/html"
          lineWrapping={editorLineWrapping}
          fontSize={editorFontSize}
          indentSize={editorIndentSize}
          keyMap={editorKeyMap}
          placeholder="..."
	  height="50%"
          onChange={this._onTemplateChange}
        />
      </span>
    );
  }
}

TemplateView.propTypes = {
  data: PropTypes.string.isRequired,
  request: PropTypes.object.isRequired
};

export default TemplateView;
