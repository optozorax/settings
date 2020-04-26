// ==UserScript==
// @name        Pixiv Shortcut Keys
// @namespace   http://userscripts.org/users/121129
// @description pixiv にショートカットキーを追加
// @match       *://www.pixiv.net/search.php*
// @match       *://www.pixiv.net/new_illust.php*
// @match       *://www.pixiv.net/new_illust_r18.php*
// @match       *://www.pixiv.net/member_illust.php*
// @match       *://www.pixiv.net/bookmark.php*
// @match       *://www.pixiv.net/ranking.php*
// @match       *://www.pixiv.net/mypage.php*
// @match       *://www.pixiv.net/cate_r18.php*
// @match       *://www.pixiv.net/member.php*
// @version     34
// @grant       GM_addStyle
// @run-at      document-start
// @license     MIT
// @noframes
// ==/UserScript==

;(function() {
  'use strict'

  var Key = { LEFT: 37
            , UP: 38
            , RIGHT: 39
            , DOWN: 40
            , B: 66
            , F: 70
            , H: 72
            , J: 74
            , K: 75
            , L: 76
            , N: 78
            , O: 79
            , P: 80
            , V: 86
            , W: 87
            }

  function KeyMap() {
    this.entries = []
    this.keyDownListener = this.keyDowned.bind(this)
  }
  KeyMap.prototype.add = function(key, action) {
    this.entries.push({ keyCode: key, action: action})
  }
  KeyMap.prototype.remove = function(key) {
    this.entries = this.entries.filter(function(e) { return e.keyCode !== key })
  }
  KeyMap.prototype.keyDowned = function(keyEvent) {
    const u = new URL(window.location.href)
    if (u.pathname === '/member_illust.php' && u.searchParams.get('mode') === 'medium') return

    var tagName = keyEvent.target.tagName
    if (tagName === 'INPUT' || tagName === 'TEXTAREA') return

    this.entries.filter(function(entry) {
      return !keyEvent.altKey
          && !keyEvent.ctrlKey
          && !keyEvent.metaKey
          && !keyEvent.shiftKey
          && keyEvent.keyCode === entry.keyCode
    }).forEach(function(entry) {
      keyEvent.stopImmediatePropagation()
      keyEvent.preventDefault()
      entry.action()
    })
  }

  function PixivPage() {}
  PixivPage.prototype.focusSearchTextInput = function() {
    var e = document.getElementById('suggest-input')
    e.focus()
    e.select()
  }
  PixivPage.prototype.addShortcuts = function() {
    var km = this.keyMap = new KeyMap()
    window.addEventListener('keydown', km.keyDowned.bind(km), true)
    km.add(Key.F, this.focusSearchTextInput.bind(this))
  }

  var IllustAnchorTable = (function() {
    function getOffsetTop(anchor) {
      return window.pageYOffset + anchor.parentNode.getBoundingClientRect().top
    }
    function IllustAnchorTable(illustAnchors) {
      var top2illusts = []
      var acceptableTopDiff = 50
      var getIllusts = function(top, range) {
        for (var i = 0; i < top2illusts.length; i++) {
          var e = top2illusts[i]
          var diff = acceptableTopDiff
          if (e.top - diff <= top && top <= e.top + diff) return e.illusts
        }
        return null
      }
      illustAnchors.forEach(function(illust) {
        var top = getOffsetTop(illust)
        var illusts = getIllusts(top)
        if (illusts) {
          illusts.push(illust)
        } else {
          top2illusts.push({top: top, illusts: [illust]})
        }
      })
      this.data = top2illusts.sort(function(e1, e2) {
        if (e1.top < e2.top) return -1
        if (e1.top > e2.top) return 1
        return 0
      }).map(function(e) { return e.illusts })
    }
    IllustAnchorTable.prototype.getPointOf = function(illustAnchor) {
      for (var row = 0; row < this.data.length; row++) {
        var col = this.data[row].indexOf(illustAnchor)
        if (col !== -1) return { row: row, column: col }
      }
      return null
    }
    IllustAnchorTable.prototype.getIllustAnchorAt = function(row, column) {
      return this.data[row][column]
    }
    IllustAnchorTable.prototype.getRowLength = function() {
      return this.data.length
    }
    IllustAnchorTable.prototype.getColumnLength = function(row) {
      return this.data[row].length
    }
    IllustAnchorTable.prototype.getIllustAnchorsOnRow = function(row) {
      return this.data[row].slice()
    }
    return IllustAnchorTable
  })()

  var IllustListPage = (function() {
    function ArrowKeyHandler() {}
    ArrowKeyHandler.prototype.handle = function(page) {
      var illustAnchors = page.getIllustAnchors()
      if (illustAnchors.length === 0) return

      var table = new IllustAnchorTable(illustAnchors)
      var focused = page.getFocusedIllustAnchor()
      if (focused) {
        var p = table.getPointOf(focused)
        if (this.isFocusOnEdge(table, p)) {
          if (page.edgeActionEnabled) this.doIfFocusOnEdge(page)
        } else {
          this.doIfNotFocusOnEdge(page, table, p)
        }
      } else {
        this.doIfHasNoFocus(page, table)
      }
    }

    function DownKeyHandler() {}
    DownKeyHandler.prototype = Object.create(ArrowKeyHandler.prototype)
    DownKeyHandler.prototype.isFocusOnEdge = function(table, point) {
      return point.row === table.getRowLength() - 1
    }
    DownKeyHandler.prototype.doIfFocusOnEdge = function(page) {
      page.moveToNextPage()
    }
    DownKeyHandler.prototype.doIfNotFocusOnEdge = function(page, table, point) {
      var row = point.row + 1
      var col = Math.min(point.column, table.getColumnLength(row) - 1)
      page.activateIllustAnchor(table.getIllustAnchorAt(row, col))
    }
    DownKeyHandler.prototype.doIfHasNoFocus = function(page, table) {
      page.activateIllustAnchor(table.getIllustAnchorAt(0, 0))
    }

    function UpKeyHandler() {}
    UpKeyHandler.prototype = Object.create(ArrowKeyHandler.prototype)
    UpKeyHandler.prototype.isFocusOnEdge = function(table, point) {
      return point.row === 0
    }
    UpKeyHandler.prototype.doIfFocusOnEdge = function(page) {
      page.moveToPrevPage()
    }
    UpKeyHandler.prototype.doIfNotFocusOnEdge = function(page, table, point) {
      var row = point.row - 1
      var col = Math.min(point.column, table.getColumnLength(row) - 1)
      page.activateIllustAnchor(table.getIllustAnchorAt(row, col))
    }
    UpKeyHandler.prototype.doIfHasNoFocus = function(page, table) {
      var row = table.getRowLength() - 1
      page.activateIllustAnchor(table.getIllustAnchorAt(row, 0))
    }

    function LeftKeyHandler() {}
    LeftKeyHandler.prototype = Object.create(ArrowKeyHandler.prototype)
    LeftKeyHandler.prototype.isFocusOnEdge = function(table, point) {
      return point.row === 0 && point.column === 0
    }
    LeftKeyHandler.prototype.doIfFocusOnEdge = function(page) {
      page.moveToPrevPage()
    }
    LeftKeyHandler.prototype.doIfNotFocusOnEdge = function(page, table, point) {
      var row = point.column === 0 ? point.row - 1 : point.row
      var col = point.column === 0 ? table.getColumnLength(row) - 1
                                   : point.column - 1
      page.activateIllustAnchor(table.getIllustAnchorAt(row, col))
    }
    LeftKeyHandler.prototype.doIfHasNoFocus = function(page, table) {
      var row = table.getRowLength() - 1
      page.activateIllustAnchor(
        table.getIllustAnchorAt(row, table.getColumnLength(row) - 1))
    }

    function RightKeyHandler() {}
    RightKeyHandler.prototype = Object.create(ArrowKeyHandler.prototype)
    RightKeyHandler.prototype.isFocusOnEdge = function(table, point) {
      return point.row === table.getRowLength() - 1
          && point.column === table.getColumnLength(point.row) - 1
    }
    RightKeyHandler.prototype.doIfFocusOnEdge = function(page) {
      page.moveToNextPage()
    }
    RightKeyHandler.prototype.doIfNotFocusOnEdge = function(page, table, point) {
      var colLen = table.getColumnLength(point.row) - 1
      var row = point.column === colLen ? point.row + 1 : point.row
      var col = point.column === colLen ? 0 : point.column + 1
      page.activateIllustAnchor(table.getIllustAnchorAt(row, col))
    }
    RightKeyHandler.prototype.doIfHasNoFocus = function(page, table) {
      page.activateIllustAnchor(table.getIllustAnchorAt(0, 0))
    }

    function IllustListPage() {
      PixivPage.call(this)
      this.selector = {
          nextAnchor: 'a[rel~="next"]'
        , prevAnchor: 'a[rel~="prev"]'
        , illustAnchors: 'ul._image-items li.image-item a.work'
      }
      this.edgeActionEnabled = true
    }
    IllustListPage.prototype = Object.create(PixivPage.prototype)
    IllustListPage.prototype.isCurrent = function() {
      var p = window.location.pathname
      return p === '/new_illust.php'
          || p === '/new_illust_r18.php'
    }
    IllustListPage.prototype.moveToNextPage = function() {
      var nextAnchor = document.querySelector(this.selector.nextAnchor)
      if (nextAnchor) nextAnchor.click()
    }
    IllustListPage.prototype.moveToPrevPage = function() {
      var prevAnchor = document.querySelector(this.selector.prevAnchor)
      if (prevAnchor) prevAnchor.click()
    }
    IllustListPage.prototype.getIllustAnchors = function() {
      return Array.prototype.slice.call(
               document.querySelectorAll(this.selector.illustAnchors))
    }
    IllustListPage.prototype.getFocusedIllustAnchor = function() {
      var illustAnchors = this.getIllustAnchors()
      var i = illustAnchors.indexOf(document.activeElement)
      return i === -1 ? null : illustAnchors[i]
    }
    IllustListPage.prototype.getAdjustedClientRectTop = function(rect) {
      var result = rect.top - (this.additionalScrollYOffset || 0)
        , uiFixed = document.querySelector('._header.ui-fixed')
      if (uiFixed) result -= uiFixed.offsetHeight
      return result
    }
    IllustListPage.prototype.scrollIfOutOfViewport = function(element) {
      var rect = element.getBoundingClientRect()
      var add = this.additionalScrollYOffset || 0
      if (rect.bottom + add > window.innerHeight) {
        window.scrollBy(0, rect.bottom - window.innerHeight + add)
      } else if (this.getAdjustedClientRectTop(rect) < 0) {
        window.scrollBy(0, this.getAdjustedClientRectTop(rect))
      }
    }
    IllustListPage.prototype.getElementToScrollTo = function(illustAnchor) {
      return illustAnchor.parentNode
    }
    IllustListPage.prototype.activateIllustAnchor = function(illustAnchor) {
      var elementToScrollTo = this.getElementToScrollTo(illustAnchor)
      this.scrollIfOutOfViewport(elementToScrollTo)
      illustAnchor.focus()
    }
    IllustListPage.prototype.moveToNextIllust = function() {
      new RightKeyHandler().handle(this)
    }
    IllustListPage.prototype.moveToPrevIllust = function() {
      new LeftKeyHandler().handle(this)
    }
    IllustListPage.prototype.moveToLowerIllust = function() {
      new DownKeyHandler().handle(this)
    }
    IllustListPage.prototype.moveToUpperIllust = function() {
      new UpKeyHandler().handle(this)
    }
    IllustListPage.prototype.openImage = function() {
      var illustAnchors = this.getIllustAnchors()
      var i = illustAnchors.indexOf(document.activeElement)
      if (i !== -1) window.open(illustAnchors[i].href, '_blank')
    }
    IllustListPage.prototype.addShortcuts = function() {
      PixivPage.prototype.addShortcuts.call(this)
      this.keyMap.add(Key.N, this.moveToNextPage.bind(this))
      this.keyMap.add(Key.P, this.moveToPrevPage.bind(this))

      this.keyMap.add(Key.L, this.moveToNextIllust.bind(this))
      this.keyMap.add(Key.RIGHT, this.moveToNextIllust.bind(this))

      this.keyMap.add(Key.H, this.moveToPrevIllust.bind(this))
      this.keyMap.add(Key.LEFT, this.moveToPrevIllust.bind(this))

      this.keyMap.add(Key.K, this.moveToUpperIllust.bind(this))
      this.keyMap.add(Key.UP, this.moveToUpperIllust.bind(this))

      this.keyMap.add(Key.J, this.moveToLowerIllust.bind(this))
      this.keyMap.add(Key.DOWN, this.moveToLowerIllust.bind(this))

      this.keyMap.add(Key.O, this.openImage.bind(this))
      this.keyMap.add(Key.V, this.openImage.bind(this))
    }
    return IllustListPage
  })()

  function AnyHeightThumbPage() {
    IllustListPage.call(this)
  }
  AnyHeightThumbPage.prototype = Object.create(IllustListPage.prototype)
  AnyHeightThumbPage.prototype.getElementToScrollTo = function(illustAnchor) {
    var table = new IllustAnchorTable(this.getIllustAnchors())
      , point = table.getPointOf(illustAnchor)
      , illustAnchorsOnRow = table.getIllustAnchorsOnRow(point.row)
      , maxHeight = 0
      , result = null
    illustAnchorsOnRow.forEach(function(illustAnchor) {
      var parent = this.getScrollTargetAncestor(illustAnchor)
        , height = parent.getBoundingClientRect().height
      if (height > maxHeight) {
        maxHeight = height
        result = parent
      }
    }, this)
    return result
  }
  AnyHeightThumbPage.prototype.getScrollTargetAncestor = function(child) {
    return child.parentNode
  }

  function SearchResultPage() {
    AnyHeightThumbPage.call(this)
    this.selector.illustAnchors = '#js-react-search-mid figure > :not(figcaption) a[href^="/member_illust.php?mode=medium&illust_id="]'
    this.additionalScrollYOffset = 10
  }
  SearchResultPage.prototype = Object.create(AnyHeightThumbPage.prototype)
  SearchResultPage.prototype.isCurrent = function() {
    return window.location.pathname === '/search.php'
  }
  SearchResultPage.prototype.getScrollTargetAncestor = function(child) {
    return child.parentNode.parentNode.parentNode
  }

  function MemberIllustPage() {
    AnyHeightThumbPage.call(this)
    this.selector.illustAnchors = '.kbZjQ32'
    this.selector.nextAnchor = '._3eQhMn5:last-child:not(._1lT-DwS)'
    this.selector.prevAnchor = '._3eQhMn5:first-child:not(._1lT-DwS)'
    this.additionalScrollYOffset = 30
  }
  MemberIllustPage.prototype = Object.create(AnyHeightThumbPage.prototype)
  MemberIllustPage.prototype.isCurrent = function() {
    return (this.isMemberIllustPHP()
         && !this.isMedium()
         && !this.isManga()
         && !this.isBig())
        || window.location.pathname === '/bookmark.php'
  }
  MemberIllustPage.prototype.isMemberIllustPHP = function() {
    return window.location.pathname === '/member_illust.php'
        || window.location.pathname === '/member.php'
  }
  MemberIllustPage.prototype.isMedium = function() {
    return window.location.search.indexOf('mode=medium') >= 0
  }
  MemberIllustPage.prototype.isManga = function() {
    return window.location.search.indexOf('mode=manga') >= 0
  }
  MemberIllustPage.prototype.isBig = function() {
    return window.location.search.indexOf('mode=big') >= 0
  }
  MemberIllustPage.prototype.getAnchorOf = function(pathname) {
    for (const a of Array.from(document.querySelectorAll('._3t_X-Rz'))) {
      if (a.pathname === pathname) {
        return a
      }
    }
    return null
  }
  MemberIllustPage.prototype.moveToWorkPage = function() {
    window.location.pathname = '/member_illust.php'
  }
  MemberIllustPage.prototype.moveToBookmarkPage = function() {
    const a = this.getAnchorOf('/bookmark.php')
    if (a) a.click()
  }
  MemberIllustPage.prototype.addShortcuts = function() {
    AnyHeightThumbPage.prototype.addShortcuts.call(this)
    this.keyMap.add(Key.W, this.moveToWorkPage.bind(this))
    this.keyMap.add(Key.B, this.moveToBookmarkPage.bind(this))
  }

  function RankingPage() {
    AnyHeightThumbPage.call(this)
    this.selector.illustAnchors =
      '.ranking-items .ranking-item:not([class*="_attr-filter-hidden"]) a.work'
    this.selector.nextAnchor = 'li.after > a'
    this.selector.prevAnchor = 'li.before > a'
    this.additionalScrollYOffset = 30
    this.edgeActionEnabled = false
  }
  RankingPage.prototype = Object.create(AnyHeightThumbPage.prototype)
  RankingPage.prototype.isCurrent = function() {
    return window.location.pathname === '/ranking.php'
  }
  RankingPage.prototype.getAdjustedClientRectTop = function(rect) {
    var prot = AnyHeightThumbPage.prototype
      , result = prot.getAdjustedClientRectTop.call(this, rect)
      , uiFixed = document.querySelector('.ui-fixed.ranking-menu')
    if (uiFixed) result -= uiFixed.offsetHeight
    return result
  }
  RankingPage.prototype.getScrollTargetAncestor = function(child) {
    return child.parentNode.parentNode
  }

  function MyPage() { PixivPage.call(this) }
  MyPage.prototype = Object.create(PixivPage.prototype)
  MyPage.prototype.isCurrent = function() {
    return window.location.pathname === '/mypage.php'
        || window.location.pathname === '/cate_r18.php'
  }

  var GM_addStyle = window.GM_addStyle
  if (GM_addStyle === undefined) {
    GM_addStyle = function(css) {
      var style = document.createElement('style')
      style.type = 'text/css'
      style.textContent = css
      document.documentElement.appendChild(style)
    }
  }
  GM_addStyle(
      '#js-react-search-mid figure > :not(figcaption) a[href^="/member_illust.php?mode=medium&illust_id="]:focus,'
    + 'li.image-item > a.work:focus div._layout-thumbnail,'
    + '.kbZjQ32:focus > .P1uthkK,'
    + 'div.ranking-items a.work:focus div._layout-thumbnail {'
    + '  outline: 3px solid red !important;'
    + '}')

 ;[ new IllustListPage()
  , new MemberIllustPage()
  , new RankingPage()
  , new MyPage()
  , new SearchResultPage()
  ].forEach(function(page) {
    if (page.isCurrent()) page.addShortcuts()
  })
})()
