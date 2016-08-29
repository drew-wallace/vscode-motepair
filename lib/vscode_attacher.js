(function () {
  'use strict';

  /**
   * @param cm - CodeMirror instance
   * @param ctx - Share context
   */
  function shareVSCodeEditor(TextEditor, ctx) {
    if (!ctx.provides.text) throw new Error('Cannot attach to non-text document');

    var suppress = false;
    var text = ctx.get() //|| ''; // Due to a bug in share - get() returns undefined for empty docs.
    if (text.length === 0){
      ctx.insert(0, TextEditor.getText());
    } else if (text !== TextEditor.getText()) {
      TextEditor.setText(text)
    }

    check();

    // *** remote -> local changes

    ctx.onInsert = function (index, text) {
      TextEditor.isDestroyed();
      if (TextEditor.isDestroyed()) return; // returns when TextEditor is destroyed.

      buffer = TextEditor.getBuffer()

      TextEditor.suppress = true;
      buffer.insert(buffer.positionForCharacterIndex(index), text);
      TextEditor.scrollToBufferPosition(buffer.positionForCharacterIndex(index), {center: true});
      TextEditor.suppress = false;
      check();
    };

    ctx.onRemove = function (index, length) {
      TextEditor.isDestroyed();
      if (TextEditor.isDestroyed()) return; // returns when TextEditor is destroyed.

      buffer = TextEditor.getBuffer()

      TextEditor.suppress = true;
      var from = buffer.positionForCharacterIndex(index);
      var to = buffer.positionForCharacterIndex(index + length);
      buffer.delete([from.toArray(), to.toArray()])
      TextEditor.scrollToBufferPosition(buffer.positionForCharacterIndex(index), {center: true});
      TextEditor.suppress = false;
      check();
    };

    // *** local -> remote changes

    // cm.on('change', onLocalChange);
    var buffer = TextEditor.getBuffer()
    var disposable = buffer.onDidChange(onLocalChange)

    function onLocalChange(event) {
      if (TextEditor.suppress) return;
      applyToShareJS(TextEditor, event);
      check();
    }

    TextEditor.detachShareJsDoc = function () {
      ctx.onRemove = null;
      ctx.onInsert = null;
      disposable.dispose()
    }

    // Convert a CodeMirror change into an op understood by share.js
    function applyToShareJS(TextEditor, event) {
      var startPos = 0

      if(event.oldText.length !== 0){
        startPos = buffer.characterIndexForPosition(event.oldRange.start)
        ctx.remove(startPos, event.oldText.length);
      }

      if (event.newText.length > 0) {
        startPos = buffer.characterIndexForPosition(event.newRange.start)
        ctx.insert(startPos, event.newText);
      }

    }

    function check() {
      setTimeout(function () {
        var editorText = TextEditor.getText();
        var otText = ctx.get() || '';

        if (editorText != otText) {
          console.error("Text does not match!");
          console.error("editor: " + editorText);
          console.error("ot: " + otText);
          // Replace the editor text with the ctx snapshot.
          TextEditor.suppress = true;
          TextEditor.setText(otText);
          TextEditor.suppress = false;
        }
      }, 0);
    }

    return ctx;
  }

    module.exports = shareVSCodeEditor;
})();
