// ==UserScript==
// @name         Автоматическое переключение языка для раскладки ergozorax
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Для набора текстов со смешанным языком, чтобы не тратить мыслетопливо на переключение языка.
// @author       You
// @match        https://klava.org/keyboard*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    var layout = [
        ['й', ';'],
        ['ц', '{'],
        ['у', '}'],
        ['е', 'p'],
        ['ф', 'y'],

        ['к', 'a'],
        ['м', 'o'],
        ['в', 'e'],
        ['а', 'u'],
        ['п', 'i'],

        ['я', '\''],
        ['ч', 'q'],
        ['с', 'j'],
        ['и', 'k'],
        ['ы', 'x'],

        ['щ', 'f'],
        ['г', 'g'],
        ['т', 'c'],
        ['н', 'r'],
        ['з', 'l'],
        ['ъ', '\\'],

        ['р', 'd'],
        ['о', 'h'],
        ['л', 't'],
        ['д', 'n'],
        ['ж', 's'],
        ['э', '-'],

        ['ш', 'b'],
        ['ь', 'm'],
        ['б', 'w'],
        ['ю', 'v'],
        ['х', 'z'],
        ['ё', '#'],
    ];
    let map = new Map();
    for (let i of layout) {
        map.set(i[0], i[1]);
        map.set(i[1], i[0]);
    }

    var textarea = document.getElementById("input");
    function eventHandler(event) {
        if (event.inputType == "insertText") {
            var data = event.data;
            var text = document.getElementsByClassName("type2")[0].innerHTML;
            if (map.get(data) == text) {
                textarea.value = textarea.value.substring(0, textarea.value.length-1) + text;
            }
        }
    }
    textarea.addEventListener("input", eventHandler);
})();