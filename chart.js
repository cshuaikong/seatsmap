/*
    Copyright Seats.io bvba. All rights reserved.
*/

'use strict'

if (typeof (seatsio) == 'undefined') {
    (function () {
        var seatsio = {}

        var cdnUrl = 'https://cdn-staging-eu.seatsio.net'
        var dataCollectorUrl = 'https://data-staging.seatsio.net'
        seatsio.environment = 'STAGING'

        if (seatsio.environment !== 'DEV' && seatsio.environment !== 'REVIEW') {
            if (wasScriptLoadedFromDomains('chart.js', ['seats.io'])) {
                console.warn('chart.js was loaded from the seats.io domain. Prefer loading it from ' + cdnUrl + '/chart.js instead. Read more at https://bit.ly/2KOPkDO.')
            } else if (!wasScriptLoadedFromDomains('chart.js', ['seatsio.net'])) {
                logEventInDatacollector('CHART_RENDERING_ERROR', { error: 'CHARTJS_LOADED_FROM_INVALID_DOMAIN' }, dataCollectorUrl)
                console.error('chart.js was not loaded from the seatsio.net (or seats.io) domain. Please load it from ' + cdnUrl + '/chart.js')
                return
            }
        }

        seatsio.onLoad = function (f) {
            f()
        }

        seatsio.charts = []

        seatsio.apiUrl = 'https://api-staging-eu.seatsio.net'
        seatsio.CDNUrl = cdnUrl
        seatsio.publicApiUrl = 'https://cdn-staging-eu.seatsio.net'
        seatsio.CDNStaticFilesUrl = 'https://cdn-staging-eu.seatsio.net/static/version/seatsio-ui-staging-01016-9kc'
        seatsio.dataCollectorUrl = dataCollectorUrl
        seatsio.messagingUrl = 'wss://messaging-staging-eu.seatsio.net'
        seatsio.commitHash = 'a0457bdd43d384507bc2698cd6d9cf12c7e073cf'
        seatsio.chartToken = 'df1d7a0ce0937f82ca0c457d17e1b8731a61f9af0308bf6aa2d2fcdc0e7e3f1a'
        seatsio.region = 'eu'

        function addEvent (eventName, callback) {
            if (window.addEventListener) {
                window.addEventListener(eventName, callback)
            } else {
                window.attachEvent('on' + eventName, callback)
            }
        }

        seatsio.SeatingChartDesignerConfigValidator = function () {
}

seatsio.SeatingChartDesignerConfigValidator.prototype.validate = function (config) {
    if (config.divId !== undefined) {
        if (!(document.getElementById(config.divId) instanceof Element)) {
            seatsio.SeatingChartConfigValidator.error('divId should be the id of an existing Element: https://developer.mozilla.org/en-US/docs/Web/API/Element')
        }
    }
}

seatsio.SeatingChartDesignerConfigValidator.error = function (msg) {
    throw new Error('Invalid seats.io designer config: ' + msg)
}

seatsio.getChart = function (iframeContentWindow) {
    for (let i = 0; i < this.charts.length; ++i) {
        const iframe = this.charts[i].iframe
        if (iframe && iframe.contentWindow === iframeContentWindow) {
            return this.charts[i]
        }
    }
}

seatsio.destroyCharts = function () {
    seatsio.charts.slice().forEach(function (chart) {
        chart.destroy()
    })
}

seatsio.DOMElementListener = function () {
    this.elementFetcher = null
    this.widthChangedListener = null
    this.dimensionsChangedListener = null
    this.elementMadeVisibleListener = null
    this.elementMadeInvisibleListener = null
    this.positionInViewportChangedListener = null
    this.maxSize = null
    this.maxSizeExceededListener = null
    this.lastDimensions = null
    this.lastPositionInViewport = null
    this.stopRequested = false
    this.elementIsVisible = null
}

seatsio.DOMElementListener.prototype.withElementFetcher = function (elementFetcher) {
    this.elementFetcher = elementFetcher
    return this
}

seatsio.DOMElementListener.prototype.onInitialDimensionsDetermined = function (initialDimensionsDeterminedListener) {
    this.initialDimensionsDeterminedListener = initialDimensionsDeterminedListener
    return this
}

seatsio.DOMElementListener.prototype.onWidthChanged = function (widthChangedListener) {
    this.widthChangedListener = widthChangedListener
    return this
}

seatsio.DOMElementListener.prototype.onMaxSizeExceeded = function (maxSize, maxSizeExceededListener) {
    this.maxSize = maxSize
    this.maxSizeExceededListener = maxSizeExceededListener
    return this
}

seatsio.DOMElementListener.prototype.onDimensionsChanged = function (dimensionsChangedListener) {
    this.dimensionsChangedListener = dimensionsChangedListener
    return this
}

seatsio.DOMElementListener.prototype.onElementMadeInvisible = function (elementMadeInvisibleListener) {
    this.elementMadeInvisibleListener = elementMadeInvisibleListener
    return this
}

seatsio.DOMElementListener.prototype.onElementMadeVisible = function (elementMadeVisibleListener) {
    this.elementMadeVisibleListener = elementMadeVisibleListener
    return this
}

seatsio.DOMElementListener.prototype.onPositionInViewportChanged = function (positionInViewportChangedListener) {
    this.positionInViewportChangedListener = positionInViewportChangedListener
    return this
}

seatsio.DOMElementListener.prototype.start = function () {
    this.listenForChanges()
    return this
}

seatsio.DOMElementListener.prototype.stop = function () {
    this.stopRequested = true
    return this
}

seatsio.DOMElementListener.prototype.listenForChanges = function () {
    if (!this.shouldStop()) {
        this.invokeElementVisibilityChangedListenersIfNeeded()
        if (this.lastDimensions === null) {
            this.lastDimensions = this.determineInitialDimensions()
        } else {
            this.invokeDimensionsChangedListenerIfNeeded()
        }
        this.invokePositionInViewportChangedListenerIfNeeded()
    }
    this.relistenForChanges()
}

seatsio.DOMElementListener.prototype.relistenForChanges = function () {
    requestAnimationFrame(this.listenForChanges.bind(this))
}

seatsio.DOMElementListener.prototype.determineInitialDimensions = function () {
    const initialDimensions = this.elementDimensions()
    if (initialDimensions.width === 0 && initialDimensions.height === 0) {
        return null
    }
    if (this.initialDimensionsDeterminedListener) {
        this.initialDimensionsDeterminedListener(initialDimensions.width, initialDimensions.height)
    }
    return initialDimensions
}

seatsio.DOMElementListener.prototype.shouldStop = function () {
    const element = this.elementFetcher()
    return !element || this.stopRequested
}

seatsio.DOMElementListener.prototype.invokeDimensionsChangedListenerIfNeeded = function () {
    const elementDimensions = this.elementDimensions()
    this.checkForWidthChanges(elementDimensions)
    this.checkForDimensionChanges(elementDimensions)
    this.lastDimensions = elementDimensions
}

seatsio.DOMElementListener.prototype.invokePositionInViewportChangedListenerIfNeeded = function () {
    const element = new seatsio.Element(this.elementFetcher())
    const positionInViewport = element.getPositionInViewport()
    const positionInViewportChanged = !this.positionsInViewportAreEqual(this.lastPositionInViewport, positionInViewport)
    const viewportSizeChanged = !this.viewportSizesAreEqual(this.lastViewportWidth, this.lastViewportHeight, window.innerWidth, window.innerHeight)
    if (positionInViewportChanged || viewportSizeChanged) {
        this.lastPositionInViewport = positionInViewport
        this.lastViewportWidth = window.innerWidth
        this.lastViewportHeight = window.innerHeight
        this.invokePositionInViewportChangedListener(this.lastPositionInViewport, this.lastViewportWidth, this.lastViewportHeight)
    }
}

seatsio.DOMElementListener.prototype.invokeElementVisibilityChangedListenersIfNeeded = function () {
    const wasVisible = this.elementIsVisible
    const isNowVisible = new seatsio.Element(this.elementFetcher()).isVisible()
    this.invokeElementMadeVisibleListenerIfNeeded(this.elementMadeVisibleListener, wasVisible, isNowVisible)
    this.invokeElementMadeInvisibleListenerIfNeeded(this.elementMadeInvisibleListener, wasVisible, isNowVisible)
}

seatsio.DOMElementListener.prototype.invokeElementMadeVisibleListenerIfNeeded = function (listener, wasVisible, isNowVisible) {
    const elementIsMadeVisible = !wasVisible && isNowVisible
    if (listener && elementIsMadeVisible) {
        this.elementIsVisible = true
        listener()
    }
}

seatsio.DOMElementListener.prototype.invokeElementMadeInvisibleListenerIfNeeded = function (listener, wasVisible, isNowVisible) {
    const elementIsMadeInvisible = wasVisible && !isNowVisible
    if (listener && elementIsMadeInvisible) {
        this.elementIsVisible = false
        listener()
    }
}

seatsio.DOMElementListener.prototype.invokePositionInViewportChangedListener = function (positionInViewport, viewportWidth, viewportHeight) {
    if (this.positionInViewportChangedListener) {
        this.positionInViewportChangedListener(positionInViewport, viewportWidth, viewportHeight)
    }
}

seatsio.DOMElementListener.prototype.triggerDimensionChange = function () {
    this.lastDimensions = { width: null, height: null }
}

seatsio.DOMElementListener.prototype.checkForWidthChanges = function (newDimensions) {
    if (newDimensions.width !== this.lastDimensions.width) {
        if (this.widthChangedListener) {
            this.widthChangedListener(newDimensions.width)
        }
    }
}

seatsio.DOMElementListener.prototype.checkForDimensionChanges = function (newDimensions) {
    if (newDimensions.width !== this.lastDimensions.width || newDimensions.height !== this.lastDimensions.height) {
        if (this.dimensionsChangedListener) {
            this.dimensionsChangedListener(newDimensions.width, newDimensions.height)
        }
    }
}

seatsio.DOMElementListener.prototype.elementDimensions = function () {
    const element = new seatsio.Element(this.elementFetcher())
    const width = element.getContentWidth()
    const height = element.getContentHeight()
    if (this.maxSize) {
        return this.elementDimensionsCapped(width, height)
    }
    return { width, height }
}

seatsio.DOMElementListener.prototype.elementDimensionsCapped = function (width, height) {
    const cappedWidth = Math.min(width, this.maxSize)
    const cappedHeight = Math.min(height, this.maxSize)
    if (width > cappedWidth || height > cappedHeight) {
        if (this.maxSizeExceededListener) {
            this.maxSizeExceededListener(width, height, cappedWidth, cappedHeight)
        }
    }
    return {
        width: cappedWidth,
        height: cappedHeight
    }
}

seatsio.DOMElementListener.prototype.positionsInViewportAreEqual = function (positionInViewportA, positionInViewportB) {
    return positionInViewportA &&
        positionInViewportB &&
        positionInViewportA.top === positionInViewportB.top &&
        positionInViewportA.right === positionInViewportB.right &&
        positionInViewportA.bottom === positionInViewportB.bottom &&
        positionInViewportA.left === positionInViewportB.left
}

seatsio.DOMElementListener.prototype.viewportSizesAreEqual = function (aWidth, aHeight, bWidth, bHeight) {
    return aWidth === bWidth &&
        aHeight === bHeight
}

seatsio.Element = function (element) {
    this.element = element
}

seatsio.Element.prototype.getPositionInViewport = function () {
    const boundingClientRect = this.element.getBoundingClientRect()
    return {
        top: boundingClientRect.top,
        bottom: boundingClientRect.bottom,
        right: boundingClientRect.right,
        left: boundingClientRect.left
    }
}

seatsio.Element.prototype.getContentHeight = function () {
    const computedStyle = getComputedStyle(this.element)
    const height = seatsio.Element.pixelsToNumber(computedStyle.height)
    if (computedStyle['box-sizing'] === 'border-box') {
        return height - seatsio.Element.verticalPaddingAndBorder(computedStyle)
    }
    return height
}

seatsio.Element.prototype.getContentWidth = function () {
    const computedStyle = getComputedStyle(this.element)
    const width = seatsio.Element.pixelsToNumber(computedStyle.width)
    if (computedStyle['box-sizing'] === 'border-box') {
        return width - seatsio.Element.horizontalPaddingAndBorder(computedStyle)
    }
    return width
}

seatsio.Element.prototype.isVisible = function () {
    return this.element.offsetHeight > 0
}

seatsio.Element.pixelsToNumber = function (value) {
    if (value === 'auto') {
        return 0
    }
    return parseFloat(value)
}

seatsio.Element.horizontalPaddingAndBorder = function (computedStyle) {
    const borderLeftWidth = seatsio.Element.pixelsToNumber(computedStyle['border-left-width'])
    const borderRightWidth = seatsio.Element.pixelsToNumber(computedStyle['border-right-width'])
    const paddingLeft = seatsio.Element.pixelsToNumber(computedStyle['padding-left'])
    const paddingRight = seatsio.Element.pixelsToNumber(computedStyle['padding-right'])
    return borderLeftWidth + borderRightWidth + paddingLeft + paddingRight
}

seatsio.Element.verticalPaddingAndBorder = function (computedStyle) {
    const borderTopWidth = seatsio.Element.pixelsToNumber(computedStyle['border-top-width'])
    const borderBottomWidth = seatsio.Element.pixelsToNumber(computedStyle['border-bottom-width'])
    const paddingTop = seatsio.Element.pixelsToNumber(computedStyle['padding-top'])
    const paddingBottom = seatsio.Element.pixelsToNumber(computedStyle['padding-bottom'])
    return borderTopWidth + borderBottomWidth + paddingTop + paddingBottom
}

seatsio.Embeddable = function () {
    this.sentWarnings = []
}

seatsio.Embeddable.prototype.init = function (config) {
    if (!config) config = {}
    if(!config.container) {
        this.divId = config.divId || 'chart'
    }
    this.config = config
    this.iframe = null
}

seatsio.Embeddable.prototype.container = function () {
    if (this.divId) {
        return document.getElementById(this.divId)
    }
    return this.getFromConfig('container')
}

seatsio.Embeddable.prototype.getFromConfig = function(key) {
    const legacyKey = this.legacyKey(key)
    if(legacyKey) {
        let legacyValue = optional(this.config[legacyKey])
        if(legacyValue.isPresent()) {
            let legacyKeyToUnderscores = legacyKey.replace(/[A-Z]/g, letter => `_${letter}`).toUpperCase()
            this.warnOnce(`DEPRECATED_${legacyKeyToUnderscores}`, `${legacyKey} is deprecated. Use ${key} instead.`)
            return legacyValue.val
        }
    }
    return this.config[key]
}

seatsio.Embeddable.prototype.legacyKey = function(key) {
    return null
}

seatsio.Embeddable.prototype.createIframe = function (src) {
    this.iframe = document.createElement('iframe')
    this.iframe.style.border = 'none'
    this.iframe.scrolling = 'no'
    this.iframe.frameBorder = 0
    this.iframe.src = src
    this.iframe.title = 'seating chart'
    this.iframe.style.width = '100%'
    this.iframe.style.height = '100%'
    this.iframe.style.display = 'block'
    this.forceEqualColorSchemeOnIframeElementAndIframeContents()
    this.overrideObjectFitForWebkit()
    this.container().appendChild(this.iframe)
}

seatsio.Embeddable.prototype.forceEqualColorSchemeOnIframeElementAndIframeContents = function () {
    /* See https://bugs.chromium.org/p/chromium/issues/detail?id=1150352 and https://github.com/w3c/csswg-drafts/issues/4772
     The rules for color-scheme in transparent iframes are:
     If the host element or its parent has a color-scheme set,
     and the iframe contents has a *different* color-scheme set
     then the iframe loses its transparency and gets a solid white or black background.
     So the "fix" to force transparency, is to force the same color-scheme value on the iframe element and the iframe contents.
     The iframe contents has a default 'light' color scheme, so we set the iframe element color scheme to light as well.
     */
    this.iframe.style['color-scheme'] = 'light'
}

seatsio.Embeddable.prototype.overrideObjectFitForWebkit = function () {
    // Webkit renders incorrectly when object-fit is set to something different than 'fill'
    // https://bugs.webkit.org/show_bug.cgi?id=240333
    this.iframe.style.setProperty('object-fit', 'fill', 'important')
}

seatsio.Embeddable.prototype.removeIframe = function () {
    if (this.iframe) {
        this.removeContainerChild(this.iframe)
        this.iframe = null
    }
}

seatsio.Embeddable.prototype.getColorScheme = function () {
    return this.getFromConfig('colorScheme') === 'dark' ? 'dark' : 'light'
}

seatsio.Embeddable.prototype.createLoadingScreen = function () {
    if (this.loadingScreen) {
        this.loadingScreen.classList.remove('hide')
        return
    }
    const containerBoundingRect = this.container().getBoundingClientRect()
    this.loadingScreen = document.createElement('div')
    this.createSpinnerStylesheet(this.loadingScreen)
    this.loadingScreen.style.position = 'absolute'
    this.loadingScreen.style.width = `${containerBoundingRect.width}px`
    this.loadingScreen.style.height = `${containerBoundingRect.height}px`
    this.loadingScreen.classList.add('seatsio-loading-screen')
    this.loadingScreen.classList.add(`${this.getColorScheme()}-bg`)
    this.container().insertBefore(this.loadingScreen, this.iframe)
    this.loadingScreen.appendChild(this.createLoadingIndicator())
}

seatsio.Embeddable.prototype.createSpinnerStylesheet = function (container) {
    const link = document.createElement('link')
    link.href = seatsio.CDNStaticFilesUrl + '/chart-js/loading.css'
    link.type = 'text/css'
    link.rel = 'stylesheet'
    container.appendChild(link)
}

seatsio.Embeddable.prototype.createLoadingIndicator = function () {
    const loadingIndicator = document.createElement('div')
    return loadingIndicator
}

seatsio.Embeddable.prototype.hideLoadingScreen = function () {
    this.loadingScreen.classList.add('hide')
}

seatsio.Embeddable.prototype.removeLoadingScreen = function () {
    if (this.loadingScreen) {
        this.removeContainerChild(this.loadingScreen)
        this.loadingScreen = null
    }
}

seatsio.Embeddable.prototype.removeContainerChild = function (child) {
    const container = this.container()
    if (container) {
        container.removeChild(child)
    }
}

seatsio.Embeddable.prototype.sendMsgToIframe = function (msg) {
    const iframe = this.getIframe()
    if (iframe) {
        iframe.contentWindow.postMessage(JSON.stringify(msg), '*')
        return true
    } else {
        return false
    }
}

seatsio.Embeddable.prototype.getIframe = function () {
    if (this.iframe && this.iframe.contentWindow) {
        return this.iframe
    }
    return undefined
}

const KEYS = {
    SHIFT: 16
}

seatsio.Embeddable.prototype.handleKey = function (e) {
    if (e.keyCode === KEYS.SHIFT) {
        this.sendMsgToIframe({
            type: e.type,
            keyCode: e.keyCode
        })
    }
}

seatsio.Embeddable.prototype.handleStorageEvent = function (e) {
}

seatsio.Embeddable.prototype.warnOnce = function (type, message) {
    if (this.sentWarnings.includes(type)) {
        return
    }
    this.sentWarnings.push(type)
    seatsio.warn(`[${type}] ${message}`)
}

seatsio.Embeddable.removeUnserializableFieldsFromConfig = function (config) {
    const copiedConfig = Object.assign({}, config)
    delete copiedConfig.container
    return copiedConfig
}

seatsio.EmbeddableConfigValidator = function () {
}

seatsio.EmbeddableConfigValidator.prototype.validate = function (config) {
    if (config.divId !== undefined && config.container !== undefined) {
        seatsio.SeatingChartConfigValidator.error('Either pass in \'divId\' or \'container\', but not both.')
    }
    if (config.container !== undefined) {
        if (!(config.container instanceof Element)) {
            seatsio.SeatingChartConfigValidator.error('container should be an Element: https://developer.mozilla.org/en-US/docs/Web/API/Element')
        }
    }
}

seatsio.EmbeddableConfigValidator.error = function (msg) {
    throw new Error('Invalid seats.io config: ' + msg)
}

seatsio.FullScreenManager = class {
    constructor (chart) {
        this.chart = chart
    }

    open (darkColorScheme) {
        if (this.chart.isFullScreen) {
            return
        }
        this.chart.settingsBeforeFullScreen = {}
        this.chart.isFullScreen = true

        this._preventHostPageScrolling()
        this._saveHostPageScrollPosition()
        this._makeChartContainerFullScreen(darkColorScheme)
        this._hideIframeUntilChartRerendered()
        this._invokeFullScreenOpenedCallback()
    }

    close () {
        if (!this.chart.isFullScreen) {
            return
        }
        this.chart.isFullScreen = false

        this._allowHostPageScrolling()
        this._restoreHostPageScrollPosition()
        this._makeChartContainerNotFullScreen()
        this._hideIframeUntilChartRerendered()
        this._invokeFullScreenClosedCallback()
    }

    _saveHostPageScrollPosition () {
        this.chart.settingsBeforeFullScreen.oldScrollY = window.scrollY
    }

    _restoreHostPageScrollPosition () {
        this._onChartRerendered(() => {
            window.scrollTo(window.scrollX, this.chart.settingsBeforeFullScreen.oldScrollY)
        })
    }

    _makeChartContainerFullScreen (darkColorScheme) {
        const container = this.chart.container()

        this.chart.settingsBeforeFullScreen.chartContainerCssText = container.style.cssText

        container.style.setProperty('position', 'fixed', 'important')
        container.style.setProperty('top', '0', 'important')
        container.style.setProperty('left', '0', 'important')
        container.style.setProperty('width', '100vw', 'important')
        container.style.setProperty('max-width', 'none', 'important')
        container.style.setProperty('min-width', 'none', 'important')
        container.style.setProperty('height', window.innerHeight + 'px', 'important')
        container.style.setProperty('max-height', 'none', 'important')
        container.style.setProperty('min-height', 'none', 'important')
        container.style.setProperty('margin', '0', 'important')
        container.style.setProperty('margin-top', '0', 'important')
        container.style.setProperty('margin-bottom', '0', 'important')
        container.style.setProperty('margin-left', '0', 'important')
        container.style.setProperty('margin-right', '0', 'important')
        container.style.setProperty('padding', '0', 'important')
        container.style.setProperty('padding-top', '0', 'important')
        container.style.setProperty('padding-bottom', '0', 'important')
        container.style.setProperty('padding-left', '0', 'important')
        container.style.setProperty('padding-right', '0', 'important')
        container.style.setProperty('border', 'none', 'important')
        container.style.setProperty('background-color', darkColorScheme ? '#212121' : 'white', 'important')
        container.style.setProperty('z-index', seatsio.MAX_Z_INDEX, 'important')

        this._adaptToWindowInnerHeightBecauseLocationBarChangesInnerHeightOniOS()

        this.chart.domElementListener.triggerDimensionChange()
    }

    _adaptToWindowInnerHeightBecauseLocationBarChangesInnerHeightOniOS () {
        requestAnimationFrame(() => {
            if (!this.chart.isFullScreen) {
                return
            }
            this.chart.container().style.setProperty('height', window.innerHeight + 'px', 'important')
            this._adaptToWindowInnerHeightBecauseLocationBarChangesInnerHeightOniOS()
        })
    }

    _makeChartContainerNotFullScreen () {
        this.chart.container().style.cssText = this.chart.settingsBeforeFullScreen.chartContainerCssText
        this.chart.domElementListener.triggerDimensionChange()
    }

    _preventHostPageScrolling () {
        this.chart.settingsBeforeFullScreen.documentOverflow = document.documentElement.style.overflow
        document.documentElement.style.setProperty('overflow', 'hidden', 'important')
    }

    _allowHostPageScrolling () {
        document.documentElement.style.overflow = this.chart.settingsBeforeFullScreen.documentOverflow
    }

    _invokeFullScreenOpenedCallback () {
        this.chart.getFromConfig('onFullScreenOpened')?.()
    }

    _invokeFullScreenClosedCallback () {
        this.chart.getFromConfig('onFullScreenClosed')?.()
    }

    _hideIframeUntilChartRerendered () {
        this.chart.iframe.style.setProperty('opacity', '0')
        this.chart.iframe.style.setProperty('transition', 'none')

        this._onChartRerendered(() => {
            this.chart.iframe.style.setProperty('transition', 'opacity 1.5s cubic-bezier(0.15, 0.8, 0.2, 1)')
            this.chart.iframe.style.setProperty('opacity', '1')
        })
    }

    _onChartRerendered (fn) {
        if (!this._onChartRerenderedFns) {
            this._onChartRerenderedFns = []
            seatsio.FullScreenManager._invokeFnsOnChartRendered(this._onChartRerenderedFns, this.chart)
        }

        this._onChartRerenderedFns.push(fn)
    }

    static _invokeFnsOnChartRendered (fns, chart) {
        const oldOnChartRerendered = chart.config.onChartRerendered

        chart.config.onChartRerendered = () => {
            fns.forEach(fn => fn())

            if (oldOnChartRerendered) {
                oldOnChartRerendered.call(chart.config, chart)
            }

            chart.config.onChartRerendered = oldOnChartRerendered
        }
    }
}

seatsio.SeatingChart = function (config, optionalEmbedType) {
    seatsio.charts.push(this)
    seatsio.isFirstChartOnPage = seatsio.isFirstChartOnPage === undefined
    this.init(config)
    this.embedType = optionalEmbedType || 'Renderer'
    new seatsio.SeatingChartConfigValidator().validate(config)
    this.selectedObjectsInput = null
    this.storage = seatsio.SeatsioStorage.create(() => sessionStorage, 'seatsio', 'Session storage not supported; stored data (e.g. hold token) will be lost after page refresh')
    this.selectedObjects = this.selectedSeats = []
    this.holdToken = null
    this.reservationToken = null
    this.requestIdCtr = 0
    this.requestCallbacks = {}
    this.requestErrorCallbacks = {}
    this.state = 'INITIAL'
    this.initialContainerDimensions = null
    this.domElementListener = null
    this.iframeElementListener = null
    this.errorSentToDataCollector = false
    this.seatsioLoadedDeferred = new Deferred()
    this.containerVisible = new Deferred()
}

seatsio.SeatingChart.prototype = new seatsio.Embeddable()

seatsio.SeatingChart.prototype.debounce = (fn, delay) => {
    let timeoutId
    return (...args) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
            fn.apply(this, args)
        }, delay)
    }
}

seatsio.SeatingChart.legacyKeys = {
    selectedObjects: 'selectedSeats',
    maxSelectedObjects: 'maxSelectedSeats',
    selectedObjectsInputName: 'selectedSeatsInputName',
    onObjectSelected: 'onSeatSelected',
    onObjectDeselected: 'onSeatDeselected',
    holdOnSelect: 'reserveOnSelect',
    regenerateHoldToken: 'regenerateReservationToken',
    holdToken: 'reservationToken',
    holdTokenInputName: 'reservationTokenInputName',
    onHoldSucceeded: 'onReservationSucceeded',
    onHoldFailed: 'onReservationFailed',
    popoverInfo: 'tooltipInfo',
    onSelectedObjectUnavailable: 'onSelectedObjectBooked'
}

seatsio.SeatingChart.prototype.legacyKey = function(key) {
    return seatsio.SeatingChart.legacyKeys[key]
}

seatsio.SeatingChart.prototype.render = function () {
    if (this.state === 'DESTROYED') {
        throw new Error('Cannot render a chart that has been destroyed')
    }
    new seatsio.EmbeddableConfigValidator().validate(this.config)
    const me = this
    const debouncedRenderChart = this.debounce((width, height) => me.renderChart(width, height), 100)
    this.state = 'RENDERING'
    this.domElementListener = new seatsio.DOMElementListener()
        .withElementFetcher(() => me.container())
        .onMaxSizeExceeded(seatsio.SeatingChart.MAX_SIZE, (width, height, cappedWidth, cappedHeight) => {
            this.warnOnce('MAX_SIZE_EXCEEDED', `Chart container div is ${width}x${height}, but we're limiting the size to ${cappedWidth}x${cappedHeight}`)
        })
        .onInitialDimensionsDetermined(function (width, height) {
            me.renderChartInitially(width, height)
        })
        .onWidthChanged(function (newWidth) {
            if (me.fitsToWidth()) {
                debouncedRenderChart(newWidth)
            }
        })
        .onDimensionsChanged(function (newWidth, newHeight) {
            if (me.fitsToWidthAndHeight()) {
                debouncedRenderChart(newWidth, newHeight)
            }
        })
        .onElementMadeVisible(function () {
            me.containerVisible.resolve()
        })
        .onElementMadeInvisible(function () {
            me.containerVisible = new Deferred()
        })
        .start()
    return this
}

seatsio.SeatingChart.prototype.getEventKey = function () {
    return this.getFromConfig('event') || (this.getFromConfig('events') && this.getFromConfig('events')[0])
}

seatsio.SeatingChart.prototype.createLoadingIndicator = function () {
    const loadingIndicator = document.createElement('div')
    loadingIndicator.classList.add('loading-indicator')
    loadingIndicator.innerHTML = this.getFromConfig('loading')
        ? `<div class="custom-indicator">${this.getFromConfig('loading')}</div>`
        : `
            <div class="bouncy ball-1 alt"></div>
            <div class="bouncy ball-2 alt"></div>
            <div class="bouncy ball-1"></div>
            <div class="bouncy ball-2"></div>
        `
    return loadingIndicator
}

seatsio.SeatingChart.prototype.isAllowedToRender = function () {
    if (isFirefox) {
        return this.containerVisible.promise
    }
    return Promise.resolve()
}

seatsio.SeatingChart.prototype.destroy = function () {
    if (this.state === 'DESTROYED') {
        throw new Error('Cannot destroy a chart that has already been destroyed')
    }
    this.unrender()
    this.state = 'DESTROYED'
    seatsio.removeFromArray(this, seatsio.charts)
}

seatsio.SeatingChart.prototype.unrender = function () {
    if (this.domElementListener) {
        this.domElementListener.stop()
    }
    if (this.iframeElementListener) {
        this.iframeElementListener.stop()
    }
    this.isFullScreen = false
    this.removeIframe()
    this.removeLoadingScreen()
    this.removeSelectedObjectsInput()
    this.removeHoldTokenInput()
    this.state = 'INITIAL'
    this.selectedObjects = this.selectedSeats = []
}

seatsio.SeatingChart.prototype.renderChartInitially = function (width, height) {
    this.renderingStart = new Date()
    this.initialContainerDimensions = { width, height }
    this.createLoadingScreen()
    if (navigator.userAgent.indexOf('Chrome') >= 0) {
        this.container().style.transformStyle = 'preserve-3d'
    }
    this.createIframe(seatsio.CDNStaticFilesUrl + '/chart-renderer/chartRendererIframe.html?environment=' + seatsio.environment + '&commit_hash=' + seatsio.commitHash)
    this.createIframeElementListener()
    this.createSelectedObjectsInput()
    this.createHoldTokenInput()
}

seatsio.SeatingChart.prototype.createIframeElementListener = function () {
    this.iframeElementListener = new seatsio.DOMElementListener()
        .withElementFetcher(() => this.getIframe())
        .onPositionInViewportChanged((positionInViewport, viewportWidth, viewportHeight) => {
            this.sendMsgToIframe({
                type: 'onPositionInViewportChanged',
                positionInViewport,
                viewportSize: {
                    width: viewportWidth,
                    height: viewportHeight
                }
            })
        })
}

seatsio.SeatingChart.prototype.renderChart = function (width, height) {
    this.isAllowedToRender()
        .then(() => {
            if (this.fitsToWidth() && width) {
                this.sendMsgToIframe({ type: 'render', dimensions: { width } })
            } else if (this.fitsToWidthAndHeight() && width && height) {
                this.sendMsgToIframe({ type: 'render', dimensions: { width, height } })
            }
        })
}

seatsio.SeatingChart.prototype.fitsToWidth = function () {
    return this.determineFitTo() === 'width'
}

seatsio.SeatingChart.prototype.fitsToWidthAndHeight = function () {
    return this.determineFitTo() === 'widthAndHeight'
}

seatsio.SeatingChart.prototype.determineFitTo = function () {
    if (this.isFullScreen) {
        return 'widthAndHeight'
    }
    if (this.getFromConfig('fitTo')) {
        return this.getFromConfig('fitTo')
    }
    if (this.containerDivHasIllegalVisibleChildren()) {
        this.warnOnce('ILLEGAL_ELEMENTS_IN_CONTAINER_DIV', 'The chart container div contains illegal elements (which were not added by seats.io). Chart will only respect the container div width, not the height.')
        return 'width'
    }
    if (this.initialContainerDimensions.width && this.initialContainerDimensions.height) {
        return 'widthAndHeight'
    }
    return 'width'
}

seatsio.SeatingChart.prototype.configured = function () {
    this.renderChart(this.domElementListener.lastDimensions.width, this.domElementListener.lastDimensions.height)
}

seatsio.SeatingChart.prototype.rendered = function (width, height) {
    this.state = 'RENDERED'
    this.resized(width, height)
    this.hideLoadingScreen()
    this.iframeElementListener.start()
    this.getFromConfig('onChartRendered')?.(this)
    if (typeof window.callPhantom === 'function') {
        window.callPhantom('chartRendered')
    }
}

seatsio.SeatingChart.prototype.rerendered = function (width, height) {
    this.resized(width, height)
    this.getFromConfig('onChartRerendered')?.(this)
}

seatsio.SeatingChart.prototype.resized = function (width, height) {
    this.iframe.style.width = width + 'px'
    this.iframe.style.height = height + 'px'
    if (this.loadingScreen) {
        this.loadingScreen.style.width = width + 'px'
        this.loadingScreen.style.height = height + 'px'
    }
}

seatsio.SeatingChart.prototype.createSelectedObjectsInput = function () {
    if (!this.getFromConfig('selectedObjectsInputName')) {
        return
    }
    this.selectedObjectsInput = document.createElement('input')
    this.selectedObjectsInput.type = 'hidden'
    this.selectedObjectsInput.name = this.getFromConfig('selectedObjectsInputName')
    this.container().appendChild(this.selectedObjectsInput)
}

seatsio.SeatingChart.prototype.removeSelectedObjectsInput = function () {
    if (this.selectedObjectsInput) {
        this.removeContainerChild(this.selectedObjectsInput)
        this.selectedObjectsInput = null
    }
}

seatsio.SeatingChart.prototype.createHoldTokenInput = function () {
    if (!this.getFromConfig('holdTokenInputName')) {
        return
    }
    const holdTokenInput = document.createElement('input')
    holdTokenInput.type = 'hidden'
    holdTokenInput.name = this.getFromConfig('holdTokenInputName')
    this.container().appendChild(holdTokenInput)
    this.holdTokenInput = holdTokenInput
}

seatsio.SeatingChart.prototype.removeHoldTokenInput = function () {
    if (this.holdTokenInput) {
        this.removeContainerChild(this.holdTokenInput)
        this.holdTokenInput = null
    }
}

seatsio.SeatingChart.prototype.updateSelectedObjectsInputValue = function () {
    if (this.selectedObjectsInput) {
        this.selectedObjectsInput.value = this.selectedObjects
    }
}

seatsio.SeatingChart.prototype.objectSelected = function (object) {
    this.selectedObjects.push(this.uuidOrLabel(object))
    this.updateSelectedObjectsInputValue()
}

seatsio.SeatingChart.prototype.objectDeselected = function (object) {
    for (let i = 0; i < this.selectedObjects.length; ++i) {
        if (this.uuidOrLabel(object) === this.selectedObjects[i]) {
            this.selectedObjects.splice(i, 1)
            break
        }
    }
    this.updateSelectedObjectsInputValue()
}

seatsio.SeatingChart.prototype.setHoldToken = function (holdTokenObject) {
    const holdToken = holdTokenObject.token
    this.reservationToken = holdToken
    this.holdToken = holdToken
    this.storage.store('holdToken', holdToken)
    this.getFromConfig('onSessionInitialized')?.(holdTokenObject)
    if (this.holdTokenInput) {
        this.holdTokenInput.value = holdToken
    }
}

seatsio.SeatingChart.prototype.fetchStoredHoldToken = function () {
    return this.storage.fetch('holdToken')
}

seatsio.SeatingChart.prototype.formatPrices = function (prices) {
    const priceFormatter = this.getFromConfig('pricing')?.priceFormatter || this.getFromConfig('priceFormatter')
    const promises = prices.map(price => Promise.resolve(priceFormatter?.(price) || price))
    return Promise.all(promises)
        .then(formattedPrices => {
            const result = {}
            prices.forEach((price, i) => {
                result[price] = formattedPrices[i]
            })
            return result
        })
}

seatsio.SeatingChart.prototype.uuidOrLabel = function (object) {
    if (this.getFromConfig('useObjectUuidsInsteadOfLabels')) {
        return object.uuid
    }
    return object.label
}

seatsio.SeatingChart.prototype.onError = function (message, renderingFailed, logError) {
    if (renderingFailed) {
        this.onRenderingFailed(message, logError)
    }
}

seatsio.SeatingChart.prototype.sendErrorToDataCollector = function () {
    if (this.errorSentToDataCollector) {
        return
    }
    const xhr = new XMLHttpRequest()
    xhr.open('POST', seatsio.dataCollectorUrl + '/events')
    xhr.setRequestHeader('Content-type', 'application/json')
    const metadata = {}
    const workspaceKey = this.getFromConfig('workspaceKey') || this.getFromConfig('publicKey')
    if (workspaceKey) {
        metadata.workspaceKey = workspaceKey
    }
    if (seatsio.region) {
        metadata.region = seatsio.region
    }
    const event = {
        eventType: 'CHART_RENDERING_ERROR',
        metadata,
        url: window.location.href
    }
    xhr.send(JSON.stringify(event))
    this.errorSentToDataCollector = true
}

seatsio.SeatingChart.prototype.onRenderingFailed = function (message, logError) {
    this.state = 'RENDERING_FAILED'
    this.hideLoadingScreen()
    if (logError) {
        this.sendErrorToDataCollector()
    }
    this.getFromConfig('onChartRenderingFailed')?.(this, message)
}

seatsio.SeatingChart.prototype.clickConfirmationButton = function (successCallback) {
    return this.asyncRequestAfterSeatsioLoaded({ type: 'clickConfirmationButton' }, successCallback)
}

seatsio.SeatingChart.prototype.zoomToZone = function (zoneKey) {
    return this.asyncRequestAfterSeatsioLoaded({ type: 'zoomToZone', zoneKey })
}

seatsio.SeatingChart.prototype.selectBestAvailable = function (bestAvailableConfig) {
    return this.sendMsgToIframeWhenAvailable({
        type: 'selectBestAvailable',
        bestAvailableConfig
    })
}

seatsio.SeatingChart.prototype.setUnavailableCategories = function (unavailableCategories) {
    return this.sendMsgToIframeWhenAvailable({
        type: 'setUnavailableCategories',
        unavailableCategories
    })
}

seatsio.SeatingChart.prototype.setAvailableCategories = function (categoryIds) {
    return this.sendMsgToIframeWhenAvailable({ type: 'setAvailableCategories', ids: categoryIds })
}

seatsio.SeatingChart.prototype.setFilteredCategories = function (categoryIds) {
    return this.sendMsgToIframeWhenAvailable({ type: 'setFilteredCategories', ids: categoryIds })
}

seatsio.SeatingChart.prototype.zoomToFilteredCategories = function () {
    return this.sendMsgToIframeWhenAvailable({ type: 'zoomToFilteredCategories' })
}

seatsio.SeatingChart.prototype.canMergePricingConfig = function (newPricingConfig) {
    const isObject = (value) => typeof value === 'object' && !Array.isArray(value)
    return isObject(this.config.pricing) && isObject(newPricingConfig)
}

seatsio.SeatingChart.prototype.changeConfig = function (config) {
    const oldPricing = Object.assign({}, this.config.pricing)
    if (config.pricing && this.canMergePricingConfig(config.pricing)) {
        config.pricing = Object.assign({}, this.config.pricing, config.pricing)
        this.config.pricing = config.pricing
        if (config.pricing.priceFormatter) {
            config.priceFormatterUsed = true
        }
    }

    const configChangePromise = this.sendMsgToIframeWhenAvailable({
        type: 'changeConfig',
        config: seatsio.SeatingChart.serializeConfigForChangeConfig(config)
    })

    // Restore existing pricing config if changeConfig fails
    configChangePromise.catch(() => {
        this.config.pricing = oldPricing
    })

    return configChangePromise
}

seatsio.SeatingChart.serializeConfigForChangeConfig = function (originalConfig) {
    const config = Object.assign({}, originalConfig)
    if(config.objectColor) {
        config.objectColor = config.objectColor.toString()
    }
    if(config.objectLabel) {
        config.objectLabel = config.objectLabel.toString()
    }
    if(config.isObjectSelectable) {
        config.isObjectSelectable = config.isObjectSelectable.toString()
    }
    return config
}

seatsio.SeatingChart.prototype.clearSelection = function (successCallback, errorCallback) {
    return this.asyncRequestAfterSeatsioLoaded({ type: 'clearSelection' }, successCallback, errorCallback)
}

seatsio.SeatingChart.prototype.resetView = function (successCallback, errorCallback) {
    return this.asyncRequestAfterSeatsioLoaded({ type: 'resetView' }, successCallback, errorCallback)
}

seatsio.SeatingChart.prototype.startNewSession = function (successCallback, errorCallback) {
    return this.asyncRequestAfterSeatsioLoaded({ type: 'startNewSession' }, successCallback, errorCallback)
}

seatsio.SeatingChart.prototype.findObject = function (objectUuidOrLabel, findObjectCallback, findObjectErrorCallback) {
    return this.asyncRequestAfterSeatsioLoaded(
        {
            type: 'findObject',
            objectUuidOrLabel
        },
        findObjectCallback,
        findObjectErrorCallback,
        objectAsJson => this.objectFromJson(objectAsJson)
    )
}

seatsio.SeatingChart.prototype.listCategories = function (listCategoriesCallback) {
    return this.asyncRequestAfterSeatsioLoaded({ type: 'listCategories' }, listCategoriesCallback)
}

seatsio.SeatingChart.prototype.listOrderChanges = function (listOrderChangesCallback) {
    return this.asyncRequestAfterSeatsioLoaded({ type: 'listOrderChanges' }, listOrderChangesCallback)
}

seatsio.SeatingChart.prototype.setSpotlightObjects = function (objectLabels) {
    return this.sendMsgToIframeWhenAvailable({ type: 'setSpotlightObjects', objectLabels })
}

seatsio.SeatingChart.prototype.setSpotlightOnSelection = function () {
    return this.sendMsgToIframeWhenAvailable({ type: 'setSpotlightOnSelection' })
}

seatsio.SeatingChart.prototype.clearSpotlightObjects = function () {
    return this.sendMsgToIframeWhenAvailable({ type: 'setSpotlightObjects', objectLabels: [] })
}

seatsio.SeatingChart.prototype.selectObjects = seatsio.SeatingChart.prototype.selectSeats = function (objectUuidsOrLabels, successCallback, errorCallback) {
    return this.asyncRequestAfterSeatsioLoaded({
        type: 'selectObjects',
        objectUuidsOrLabels
    }, successCallback, errorCallback)
}

seatsio.SeatingChart.prototype.trySelectObjects = function (objectUuidsOrLabels, successCallback, errorCallback) {
    return this.asyncRequestAfterSeatsioLoaded({
        type: 'trySelectObjects',
        objectUuidsOrLabels
    }, successCallback, errorCallback)
}

seatsio.SeatingChart.prototype.doSelectObjects = function (objectUuidsOrLabels, successCallback, errorCallback) {
    return this.asyncRequestAfterSeatsioLoaded({
        type: 'doSelectObjects',
        objectUuidsOrLabels
    }, successCallback, errorCallback)
}

seatsio.SeatingChart.prototype.deselectObjects = seatsio.SeatingChart.prototype.deselectSeats = function (objectUuidsOrLabels, successCallback, errorCallback) {
    return this.asyncRequestAfterSeatsioLoaded({
        type: 'deselectObjects',
        objectUuidsOrLabels
    }, successCallback, errorCallback)
}

seatsio.SeatingChart.prototype.selectCategories = function (categoryIds, successCallback, errorCallback) {
    return this.asyncRequestAfterSeatsioLoaded({
        type: 'selectCategories',
        ids: categoryIds
    }, successCallback, errorCallback)
}

seatsio.SeatingChart.prototype.deselectCategories = function (categoryIds, successCallback, errorCallback) {
    return this.asyncRequestAfterSeatsioLoaded({
        type: 'deselectCategories',
        ids: categoryIds
    }, successCallback, errorCallback)
}

seatsio.SeatingChart.prototype.highlightObjects = function (objectUuidsOrLabels) {
    return this.sendMsgToIframeWhenAvailable({ type: 'highlightObjects', objectUuidsOrLabels })
}

seatsio.SeatingChart.prototype.unhighlightObjects = function (objectUuidsOrLabels) {
    return this.sendMsgToIframeWhenAvailable({
        type: 'unhighlightObjects',
        objectUuidsOrLabels
    })
}

seatsio.SeatingChart.prototype.pulse = function (objectUuidsOrLabels) {
    return this.sendMsgToIframeWhenAvailable({ type: 'pulseObjects', objectUuidsOrLabels })
}

seatsio.SeatingChart.prototype.unpulse = function (objectUuidsOrLabels) {
    return this.sendMsgToIframeWhenAvailable({ type: 'unpulseObjects', objectUuidsOrLabels })
}

seatsio.SeatingChart.prototype.zoomToObjects = function (objectLabels) {
    return this.sendMsgToIframeWhenAvailable({ type: 'zoomToObjects', objectLabels })
}

seatsio.SeatingChart.prototype.zoomToSelectedObjects = function () {
    return this.sendMsgToIframeWhenAvailable({ type: 'zoomToSelectedObjects' })
}

seatsio.SeatingChart.prototype.zoomToSection = function (label) {
    return this.sendMsgToIframeWhenAvailable({ type: 'zoomToSection', label })
}

seatsio.SeatingChart.prototype.goToFloor = function (floorName) {
    return this.sendMsgToIframeWhenAvailable({ type: 'goToFloor', floorName })
}

seatsio.SeatingChart.prototype.goToAllFloorsView = function () {
    return this.sendMsgToIframeWhenAvailable({ type: 'goToAllFloorsView' })
}

seatsio.SeatingChart.prototype.setFilteredSection = function (label) {
    return this.sendMsgToIframeWhenAvailable({ type: 'setFilteredSection', label })
}

seatsio.SeatingChart.prototype.clearFilteredSection = function () {
    return this.sendMsgToIframeWhenAvailable({ type: 'clearFilteredSection' })
}

seatsio.SeatingChart.prototype.listSelectedObjects = function (callback) {
    return this.asyncRequestAfterSeatsioLoaded({ type: 'listSelectedObjects' }, callback, undefined, objectsAsJson => objectsAsJson.map(o => this.objectFromJson(o)))
}

seatsio.SeatingChart.prototype.getReportBySelectability = function (callback) {
    return this.asyncRequestAfterSeatsioLoaded({ type: 'getReportBySelectability' }, callback, undefined)
}

seatsio.SeatingChart.prototype._simulateUIEvent = function (eventType, parameters) {
    return this.asyncRequestAfterSeatsioLoaded({ type: 'simulateUIEvent', eventType, parameters })
}

seatsio.SeatingChart.prototype.isometricView = function (callback) {
    return this.asyncRequestAfterSeatsioLoaded({ type: 'isometricView' }, callback, undefined)
}

seatsio.SeatingChart.prototype.stageView = function (callback) {
    return this.asyncRequestAfterSeatsioLoaded({ type: 'stageView' }, callback, undefined)
}

seatsio.SeatingChart.prototype.sendMsgToIframeWhenAvailable = function (msg) {
    return this.seatsioLoadedDeferred
        .then(() => this.isAllowedToRender())
        .then(() => this.asyncRequest(msg))
}

seatsio.SeatingChart.prototype.asyncRequestAfterSeatsioLoaded = function (msg, successCallback, errorCallback, transformer) {
    return this.seatsioLoadedDeferred.then(() => this.asyncRequest(msg, successCallback, errorCallback, transformer))
}

seatsio.SeatingChart.prototype.asyncRequest = function (msg, successCallback, errorCallback, transformer) {
    return new Promise((resolve, reject) => {
        msg.requestId = ++this.requestIdCtr
        const sentSuccessfully = this.sendMsgToIframe(msg)
        if (!sentSuccessfully) {
            // eslint-disable-next-line prefer-promise-reject-errors
            reject()
            return
        }

        this.requestCallbacks[this.requestIdCtr] = data => {
            if (transformer) {
                data = transformer(data)
            }
            resolve(data)
            if (successCallback) {
                successCallback(data)
            }
        }

        this.requestErrorCallbacks[this.requestIdCtr] = msg => {
            reject(msg)
            if (errorCallback) {
                errorCallback(msg)
            }
        }
    })
}

seatsio.SeatingChart.prototype.asyncCallSuccess = function (requestId, data) {
    if (!this.requestCallbacks[requestId]) {
        return
    }
    this.requestCallbacks[requestId](data)
    this.requestCallbacks[requestId] = undefined
}

seatsio.SeatingChart.prototype.asyncCallError = function (requestId, msg) {
    if (!this.requestErrorCallbacks[requestId]) {
        return
    }
    this.requestErrorCallbacks[requestId](msg)
    this.requestErrorCallbacks[requestId] = undefined
}

seatsio.SeatingChart.prototype.serializeConfig = function () {
    const config = Object.assign({}, this.config)

    config.embedType = this.embedType

    Object.keys(seatsio.SeatingChart.legacyKeys).forEach(key => {
        config[key] = this.getFromConfig(key)
    })

    const implementedPromptCallbacks = []
    if (config.tooltipText) {
        config.customTooltipText = true
    }
    if (config.popoverInfo) {
        config.customPopoverInfo = true
    }
    if (config.onBestAvailableSelected) {
        config.onBestAvailableSelectedCallbackImplemented = true
    }
    if (config.onBestAvailableSelectionFailed) {
        config.onBestAvailableSelectionFailedCallbackImplemented = true
    }
    if (config.onFloorChanged) {
        config.onFloorChangedCallbackImplemented = true
    }
    if (config.onTicketTypePrompt) {
        implementedPromptCallbacks.push('onTicketTypePrompt')
    }
    if (config.onPlacesWithTicketTypesPrompt) {
        implementedPromptCallbacks.push('onPlacesWithTicketTypesPrompt')
    }
    if (config.onPlacesPrompt) {
        implementedPromptCallbacks.push('onPlacesPrompt')
    }
    if (implementedPromptCallbacks.length > 0) {
        config.implementedPromptCallbacks = implementedPromptCallbacks
    }
    if (config.objectColor) {
        config.objectColor = config.objectColor.toString()
    }
    if (config.sectionColor) {
        config.sectionColor = config.sectionColor.toString()
    }
    if (config.objectLabel) {
        config.objectLabel = config.objectLabel.toString()
    }
    if (config.objectIcon) {
        config.objectIcon = config.objectIcon.toString()
    }
    if (config.priceFormatter || config.pricing?.priceFormatter) {
        config.priceFormatterUsed = true
        config.legacyPriceFormatterUsed = config.priceFormatter !== undefined
    }
    if (config.isObjectSelectable) {
        config.isObjectSelectable = config.isObjectSelectable.toString()
    }
    if (config.canGASelectionBeIncreased) {
        config.canGASelectionBeIncreased = config.canGASelectionBeIncreased.toString()
    }
    if (config.isObjectVisible) {
        config.isObjectVisible = config.isObjectVisible.toString()
    }
    if (config.objectCategory) {
        config.objectCategory = config.objectCategory.toString()
    }
    if (config.onObjectStatusChanged) {
        config.onObjectStatusChangedCallbackImplemented = true
    }
    if (config.tooltipContents) {
        config.customTooltipContents = true
    }
    if (config.holdToken === null) {
        config.holdToken = undefined
    }
    if (config._onRenderingInfoReloaded) {
        config._onRenderingInfoReloaded = config._onRenderingInfoReloaded.toString()
    }

    return seatsio.Embeddable.removeUnserializableFieldsFromConfig(config)
}

seatsio.SeatingChart.prototype.objectFromJson = function (objectAsJson) {
    if (objectAsJson.objectType !== 'section') {
        objectAsJson.select = ticketType => {
            return this.trySelectObjects([{ label: this.uuidOrLabel(objectAsJson), ticketType }])
        }
        objectAsJson.deselect = ticketType => {
            return this.deselectObjects([{ label: this.uuidOrLabel(objectAsJson), ticketType }])
        }
        objectAsJson.highlight = () => {
            return this.highlightObjects([this.uuidOrLabel(objectAsJson)])
        }
        objectAsJson.unhighlight = () => {
            return this.unhighlightObjects([this.uuidOrLabel(objectAsJson)])
        }
        objectAsJson.pulse = () => {
            return this.pulse([this.uuidOrLabel(objectAsJson)])
        }
        objectAsJson.unpulse = () => {
            return this.unpulse([this.uuidOrLabel(objectAsJson)])
        }
        objectAsJson.isInChannel = channelKey => {
            if (!objectAsJson.hashedChannelKey) {
                return channelKey === 'NO_CHANNEL'
            }
            return seatsio.sha1(channelKey) === objectAsJson.hashedChannelKey
        }
        objectAsJson.seatId = objectAsJson.id
    }
    objectAsJson.chart = this
    return objectAsJson
}

seatsio.SeatingChart.prototype.objectsFromJson = function (objectsAsJson) {
    return objectsAsJson.map(objectAsJson => this.objectFromJson(objectAsJson))
}

seatsio.SeatingChart.prototype.rerender = function () {
    this.getFromConfig('onChartRerenderingStarted')?.(this)
    this.unrender()
    this.render()
}

seatsio.SeatingChart.prototype.openFullScreen = function (darkColorScheme) {
    new seatsio.FullScreenManager(this).open(darkColorScheme)
}

seatsio.SeatingChart.prototype.closeFullScreen = function () {
    new seatsio.FullScreenManager(this).close()
}

seatsio.SeatingChart.prototype.containerDivHasIllegalVisibleChildren = function () {
    return Array.prototype.slice.call(this.container().children)
        .filter(element => element !== this.iframe)
        .filter(element => element !== this.loadingScreen)
        .filter(element => element.offsetHeight > 0)
        .length > 0
}

seatsio.SeatingChart.prototype.messageHandlers = {
    seatsioLoaded: function (e, chart, data) {
        chart.seatsioLoadedDeferred.resolve()
        const serializedConfig = chart.serializeConfig()
        serializedConfig.configKeys = Object.entries(chart.config).filter(entry => entry[1] !== undefined).map(entry => entry[0])
        const renderingInfo = {
            renderingStartMillis: chart.renderingStart.getTime(),
            hostPageUrl: window.location.href,
            hostPageDomain: window.location.hostname,
            isInsideIframe: window !== window.parent,
            storedHoldToken: chart.fetchStoredHoldToken(),
            isFirstChartOnPage: seatsio.isFirstChartOnPage,
            chartToken: seatsio.chartToken,
            apiUrl: seatsio.apiUrl,
            publicApiUrl: seatsio.publicApiUrl,
            dataCollectorUrl: seatsio.dataCollectorUrl,
            messagingUrl: seatsio.messagingUrl
        }
        chart.sendMsgToIframe({ type: 'configure', configuration: serializedConfig, renderingInfo })
    },
    onError: function (e, chart, data) {
        chart.onError(data.message, data.renderingFailed, data.logError)
    },
    configured: function (e, chart, data) {
        chart.configured()
    },
    onChartRendered: function (e, chart, data) {
        chart.rendered(data.width, data.height)
    },
    onChartRerendered: function (e, chart, data) {
        chart.rerendered(data.width, data.height)
    },
    onOrphanSeatsChanged: function (e, chart, data) {
        chart.getFromConfig('onOrphanSeatsChanged')?.(data.orphans, data.action)
    },
    onSelectionValid: function (e, chart, data) {
        chart.getFromConfig('onSelectionValid')?.()
    },
    onSelectionInvalid: function (e, chart, data) {
        chart.getFromConfig('onSelectionInvalid')?.(data.violations)
    },
    bookableObjectEvent: function (_e, chart, data) {
        const object = chart.objectFromJson(data.object)
        if (data.subtype === 'onObjectSelected') {
            chart.objectSelected(object, data.priceLevel)
        } else if (data.subtype === 'onObjectDeselected') {
            chart.objectDeselected(object, data.priceLevel)
        }
        if (chart.getFromConfig(data.subtype)) {
            const secondParameter = data.event || data.priceLevel
            chart.getFromConfig(data.subtype)(object, secondParameter)
        }
    },
    ticketTypePrompt: function (_e, chart, data) {
        if (!chart.getFromConfig('onTicketTypePrompt')) {
            return
        }

        const objectsToSelect = chart.objectsFromJson(data.objectsToSelect)
        const objectToSelect = objectsToSelect[0]
        const parameters = {
            ticketTypes: objectToSelect.pricing.ticketTypes,
            objectToSelect
        }

        const confirmSelection = (ticketType) => {
            if (typeof ticketType !== 'string') {
                return Promise.reject(Error('"confirmSelection" from "ticketTypePrompt" expects first parameter "ticketType" to be an string.'))
            }
            return chart.doSelectObjects([{ id: objectToSelect.label, ticketType }])
        }

        chart.getFromConfig('onTicketTypePrompt')(parameters, confirmSelection)
    },
    placesPrompt: function (_e, chart, data) {
        if (!chart.getFromConfig('onPlacesPrompt')) {
            return
        }

        const objectsToSelect = chart.objectsFromJson(data.objectsToSelect)
        const objectToSelect = objectsToSelect[0]
        const parameters = {
            selectedPlaces: objectToSelect.numSelected,
            minPlaces: data.minPlaces,
            maxPlaces: data.maxPlaces,
            objectToSelect
        }

        const confirmSelection = (amount) => {
            if (typeof amount !== 'number') {
                return Promise.reject(Error('"confirmSelection" from "placesPrompt" expects first parameter "amount" to be a number.'))
            }

            const amountDelta = amount - objectToSelect.numSelected
            if (amountDelta > 0) {
                return chart.doSelectObjects([{ id: objectToSelect.label, amount: amountDelta }])
            } else if (amountDelta < 0) {
                return chart.deselectObjects([{ id: objectToSelect.label, amount: Math.abs(amountDelta) }])
            }
        }

        chart.getFromConfig('onPlacesPrompt')(parameters, confirmSelection)
    },
    placesWithTicketTypesPrompt: function (_e, chart, data) {
        if (!chart.getFromConfig('onPlacesWithTicketTypesPrompt')) {
            return
        }

        const objectsToSelect = chart.objectsFromJson(data.objectsToSelect)
        const object = objectsToSelect[0]
        const isSelectingOnePlacePerObject = objectsToSelect.length > 1
        const selectedPlacesByTicketType = isSelectingOnePlacePerObject ? {} : object.selectionPerTicketType
        const parameters = {
            selectedPlacesByTicketType,
            minPlaces: data.minPlaces,
            maxPlaces: data.maxPlaces,
            ticketTypes: object.pricing && object.pricing.ticketTypes,
            objectsToSelect
        }

        const confirmSelection = (placesByTicketTypeOrList) => {
            function toTicketTypesList (placesByTicketTypeOrList) {
                if (Array.isArray(placesByTicketTypeOrList)) {
                    return placesByTicketTypeOrList
                } else {
                    const ticketTypesList = []
                    Object.keys(placesByTicketTypeOrList).forEach(ticketType => {
                        const totalTickets = placesByTicketTypeOrList[ticketType]
                        ticketTypesList.push(...Array(totalTickets).fill(ticketType))
                    })
                    return ticketTypesList
                }
            }

            function toPlacesByTicketType (placesByTicketTypeOrList) {
                if (Array.isArray(placesByTicketTypeOrList)) {
                    const placesByTicketType = {}
                    placesByTicketTypeOrList.forEach(ticketType => {
                        placesByTicketType[ticketType] = (placesByTicketType[ticketType] || 0) + 1
                    })
                    return placesByTicketType
                } else {
                    return placesByTicketTypeOrList
                }
            }

            if (!Array.isArray(placesByTicketTypeOrList) && typeof placesByTicketTypeOrList !== 'object') {
                return Promise.reject(Error('"confirmSelection" from "placesPrompt" expects first parameter "placesByTicketType" to be either a dictionary "{ ticketType: amount }" or an array of ticket types.'))
            }

            const deselectionInstructions = []
            const selectionInstructions = []

            if (isSelectingOnePlacePerObject) {
                const ticketTypesList = toTicketTypesList(placesByTicketTypeOrList)
                selectionInstructions.push(...objectsToSelect.map((object, i) => ({ id: object.label, ticketType: ticketTypesList[i] })))
            } else {
                const placesByTicketType = toPlacesByTicketType(placesByTicketTypeOrList)
                Object.keys(placesByTicketType).forEach(ticketType => {
                    const id = object.label
                    const prevAmount = parameters.selectedPlacesByTicketType[ticketType] || 0
                    const nextAmount = parseInt(placesByTicketType[ticketType]) || 0
                    const amountDelta = nextAmount - prevAmount
                    if (amountDelta > 0) {
                        selectionInstructions.push({ id, ticketType, amount: amountDelta })
                    } else if (amountDelta < 0) {
                        deselectionInstructions.push({ id, ticketType, amount: Math.abs(amountDelta) })
                    }
                })
            }

            const promises = []
            if (deselectionInstructions.length > 0) {
                promises.push(chart.deselectObjects(deselectionInstructions))
            }
            if (selectionInstructions.length > 0) {
                promises.push(chart.doSelectObjects(selectionInstructions))
            }
            return Promise.all(promises)
        }

        chart.getFromConfig('onPlacesWithTicketTypesPrompt')(parameters, confirmSelection)
    },
    holdTokenChanged: function (e, chart, data) {
        chart.setHoldToken(data.token)
    },
    tooltipTextRequested: function (e, chart, data) {
        Promise.resolve(chart.getFromConfig('tooltipText')(chart.objectFromJson(data.object)))
            .then(tooltipText => chart.sendMsgToIframe({ type: 'tooltipTextGenerated', text: tooltipText }))
    },
    popoverInfoRequested: function (e, chart, data) {
        Promise.resolve(chart.getFromConfig('popoverInfo')(chart.objectFromJson(data.object)))
            .then(popoverInfo => chart.sendMsgToIframe({ type: 'popoverInfoGenerated', text: popoverInfo }))
    },
    tooltipContentsForEventManagerRequested: function (e, chart, data) {
        Promise.resolve(chart.getFromConfig('tooltipContents')(chart.objectFromJson(data.object)))
            .then(tooltipContents => chart.sendMsgToIframe({
                type: 'tooltipContentsForEventManagerGenerated',
                text: tooltipContents
            }))
    },
    popoverInfoForEventManagerRequested: function (e, chart, data) {
        Promise.resolve(chart.getFromConfig('popoverInfo')(chart.objectFromJson(data.object)))
            .then(popoverInfo => chart.sendMsgToIframe({
                type: 'popoverInfoForEventManagerGenerated',
                text: popoverInfo
            }))
    },
    onBestAvailableSelected: function (e, chart, data) {
        chart.getFromConfig('onBestAvailableSelected')?.(chart.objectsFromJson(data.result.objects), data.result.nextToEachOther)
    },
    onBestAvailableSelectionFailed: function (e, chart, data) {
        chart.getFromConfig('onBestAvailableSelectionFailed')?.()
    },
    onFloorChanged: function (e, chart, data) {
        chart.getFromConfig('onFloorChanged')?.(data.floor)
    },
    onHoldTokenExpired: function (e, chart, data) {
        chart.getFromConfig('onHoldTokenExpired')?.()
    },
    onHoldTokenCreationFailed: function (e, chart, data) {
        chart.getFromConfig('onHoldTokenCreationFailed')?.()
    },
    onHoldSucceeded: function (e, chart, data) {
        chart.getFromConfig('onHoldSucceeded')?.(chart.objectsFromJson(data.objects), data.priceLevels)
    },
    onHoldFailed: function (e, chart, data) {
        chart.getFromConfig('onHoldFailed')?.(chart.objectsFromJson(data.objects), data.priceLevels)
    },
    onReleaseHoldSucceeded: function (e, chart, data) {
        chart.getFromConfig('onReleaseHoldSucceeded')?.(chart.objectsFromJson(data.objects), data.priceLevels)
    },
    onReleaseHoldFailed: function (e, chart, data) {
        chart.getFromConfig('onReleaseHoldFailed')?.(chart.objectsFromJson(data.objects), data.priceLevels)
    },
    onFilteredCategoriesChanged: function (e, chart, data) {
        chart.getFromConfig('onFilteredCategoriesChanged')?.(data.filteredCategories)
    },
    priceFormattingRequested: function (e, chart, data) {
        chart.formatPrices(data.prices)
            .then(formattedPrices => chart.sendMsgToIframe(({
                type: 'pricesFormatted',
                formattedPrices
            })))
    },
    openFullScreen: (e, chart, data) => {
        chart.openFullScreen(data.darkColorScheme)
    },
    closeFullScreen: (e, chart) => {
        chart.closeFullScreen()
    },
    asyncCallSuccess: function (e, chart, data) {
        chart.asyncCallSuccess(data.requestId, data.data)
    },
    asyncCallError: function (e, chart, data) {
        chart.asyncCallError(data.requestId, data.msg)
    },
    onSubmitSucceeded: function (e, chart) {
        chart.getFromConfig('onSubmitSucceeded')?.()
    },
    onSubmitFailed: function (e, chart) {
        chart.getFromConfig('onSubmitFailed')?.()
    },
    onFilteredSectionChange: function (e, chart, data) {
        chart.getFromConfig('onFilteredSectionChange')?.(data.sections)
    },
    rerender: function (e, chart) {
        chart.rerender()
    },
    onEventsSentToDataCollector: function (e, chart, data) {
        chart.getFromConfig('onEventsSentToDataCollector')?.(data.events)
    },
    onWebsocketConnectionClosed: function (e, chart) {
        chart.getFromConfig('onWebsocketConnectionClosed')?.()
    },
    onHoldCallsInProgress: function (e, chart) {
        chart.getFromConfig('onHoldCallsInProgress')?.()
    },
    onHoldCallsComplete: function (e, chart) {
        chart.getFromConfig('onHoldCallsComplete')?.()
    },
    onRenderingInfoReloaded: function(e, chart) {
        chart.getFromConfig('_onRenderingInfoReloaded')?.(chart)
    }
}

seatsio.EventManager = class extends seatsio.SeatingChart {
    constructor (config) {
        const allowedModes = [
            'static',
            'manageForSaleConfig',
            'manageObjectStatuses',
            'manageTableBooking',
            'manageChannels',
            'manageCategories',
            'filterSections',
            'select',
            'createOrder',
            'editOrder'
        ]

        if (!allowedModes.includes(config.mode)) {
            throw new Error(`Please pass in one of the allowed modes: ${allowedModes.join(', ')}`)
        }
        super(config, 'EventManager')
        this.enableHighlight = ['select', 'static'].includes(config.mode)
    }

    setHighlightedObjects (objectUuidsOrLabels) {
        if (this.enableHighlight) {
            return this.sendMsgToIframeWhenAvailable({ type: 'setHighlightedObjects', objectUuidsOrLabels })
        }
    }

    clearHighlightedObjects () {
        if (this.enableHighlight) {
            return this.sendMsgToIframeWhenAvailable({ type: 'clearHighlightedObjects' })
        }
    }
}

seatsio.SeatingChart.MAX_SIZE = 4096

seatsio.SeatingChartConfigValidator = function () {
}

seatsio.SeatingChartConfigValidator.prototype.validate = function (config) {
    if (config.fitTo) {
        if (config.fitTo !== 'width' && config.fitTo !== 'widthAndHeight') {
            seatsio.SeatingChartConfigValidator.error('fitTo should be either width or widthAndHeight')
        }
    }
}

seatsio.SeatingChartConfigValidator.error = function (msg) {
    throw new Error('Invalid seats.io config: ' + msg)
}

seatsio.SeatingChartDesigner = function (config) {
    seatsio.charts.push(this)
    config.loading = '<div id="designerLoader"></div>'
    this.init(config)
    this.isRendered = false
    this.isDestroyed = false
    this.storage = seatsio.SeatsioStorage.create(() => localStorage, 'seatsio-designer', 'Local storage not supported; settings (e.g. whether to show the designer tutorial) will be lost after page refresh')
}

seatsio.SeatingChartDesigner.prototype = new seatsio.Embeddable()

seatsio.SeatingChartDesigner.prototype.render = function (renderedCallback) {
    if (this.isDestroyed) {
        throw new Error('Cannot render a chart that has been destroyed')
    }
    this.validateElementExists()
    this.renderedCallback = renderedCallback
    this.createLoadingScreen()
    this.createIframe(this.iframeUrl())
    this.iframe.scrolling = 'yes'
    return this
}

seatsio.SeatingChartDesigner.prototype.validateElementExists = function () {
    new seatsio.SeatingChartDesignerConfigValidator().validate(this.config)
    new seatsio.EmbeddableConfigValidator().validate(this.config)
}

seatsio.SeatingChartDesigner.prototype.createLoadingIndicator = function () {
    const loadingIndicator = document.createElement('div')
    loadingIndicator.id = 'designerLoader'
    return loadingIndicator
}

seatsio.SeatingChartDesigner.prototype.iframeUrl = function () {
    return seatsio.CDNStaticFilesUrl + '/chart-designer-v2/chartDesignerIframe.html?origin=' + window.location.origin
}

seatsio.SeatingChartDesigner.prototype.rerender = function () {
    this.isRendered = false
    this.iframe.remove()
    this.render()
}

seatsio.SeatingChartDesigner.prototype.serializeConfig = function () {
    const configWithoutUnserializableFields = seatsio.Embeddable.removeUnserializableFieldsFromConfig(this.config)
    const serializedConfig = JSON.parse(JSON.stringify(configWithoutUnserializableFields))
    if (this.config.onExitRequested) {
        serializedConfig.showExitButton = true
    }
    return serializedConfig
}

seatsio.SeatingChartDesigner.prototype.handleStorageEvent = function (e) {
    if (e.key !== 'seatsio-designer') {
        return
    }
    if (e.storageArea !== this.storage.storageProvider()) {
        return
    }
    if (!this.isRendered) {
        return
    }

    let newValue = JSON.parse(e.newValue)
    let oldValue = JSON.parse(e.oldValue)
    if (JSON.stringify(newValue.clipboard) !== JSON.stringify(oldValue.clipboard)) {
        this.sendMsgToIframe({
            type: 'clipboardUpdated',
            clipboard: newValue.clipboard
        })
    }
}

seatsio.SeatingChartDesigner.prototype.messageHandlers = {
    seatsioLoaded: function (e, chart) {
        chart.sendMsgToIframe({
            type: 'render',
            configuration: chart.serializeConfig(),
            apiUrl: seatsio.apiUrl,
            publicApiUrl: seatsio.publicApiUrl,
            dataCollectorUrl: seatsio.dataCollectorUrl,
            localSettings: chart.storage.getStore()
        })
    },
    seatsioRendered: function (e, chart) {
        chart.hideLoadingScreen()
        if (chart.renderedCallback) {
            chart.renderedCallback()
        }
        if (chart.config.onDesignerRendered) {
            chart.config.onDesignerRendered(this)
        }
        chart.isRendered = true
    },
    designerRenderingFailed: function (e, chart) {
        chart.hideLoadingScreen()
        if (chart.config.onDesignerRenderingFailed) {
            chart.config.onDesignerRenderingFailed(chart)
        }
    },
    chartCreated: function (e, chart, message) {
        chart.config.chartKey = message.data
        if (chart.config.onChartCreated) {
            chart.config.onChartCreated(message.data)
        }
    },
    chartUpdated: function (e, chart) {
        if (chart.config.onChartUpdated) {
            chart.config.onChartUpdated(chart.config.chartKey)
        }
    },
    chartPublished: function (e, chart) {
        if (chart.config.onChartPublished) {
            chart.config.onChartPublished(chart.config.chartKey)
        }
    },
    statusChanged: function (e, chart, message) {
        if (chart.config.onStatusChanged) {
            const newStatus = message.data
            chart.config.onStatusChanged(newStatus, chart.config.chartKey)
        }
    },
    exitRequested: function (e, chart) {
        chart.config.onExitRequested()
    },
    localSettingChanged: function (e, chart, message) {
        chart.storage.store(message.data.key, message.data.value)
    }
}

seatsio.SeatingChartDesigner.prototype.destroy = function () {
    if (this.isDestroyed) {
        throw new Error('Cannot destroy a chart that has already been destroyed')
    }
    this.removeIframe()
    this.removeLoadingScreen()
    seatsio.removeFromArray(this, seatsio.charts)
    this.isRendered = false
    this.isDestroyed = true
}

seatsio.SeatsioDummyStorage = class {
    fetch (key) {
    }

    store (key, value) {
    }
}

seatsio.SeatsioStorage = class {
    constructor (storageProvider, key) {
        this.storageProvider = storageProvider
        this.key = key
    }

    fetch (key) {
        return this.getStore()[key]
    }

    store (key, value) {
        const store = this.getStore()
        store[key] = value
        this.setStore(store)
    }

    getStore () {
        const store = this.storageProvider().getItem(this.key)
        if (!store) {
            return {}
        }
        return JSON.parse(store)
    }

    setStore (storeForAllCharts) {
        this.storageProvider().setItem(this.key, JSON.stringify(storeForAllCharts))
    }

    static isSupported (storageProvider) {
        try {
            storageProvider().setItem('seatsioStorageSupportedTest', 'x')
            storageProvider().removeItem('seatsioStorageSupportedTest')
            return true
        } catch (e) {
            return false
        }
    }

    static create (storageProvider, key, errorMessage) {
        if (seatsio.SeatsioStorage.isSupported(storageProvider)) {
            return new seatsio.SeatsioStorage(storageProvider, key)
        }
        seatsio.warn(errorMessage)
        return new seatsio.SeatsioDummyStorage()
    }
}

/*
 * Inspired by https://github.com/emn178/js-sha1
 */
const createSha1 = function () {
    const HEX_CHARS = '0123456789abcdef'.split('')
    const EXTRA = [-2147483648, 8388608, 32768, 128]
    const SHIFT = [24, 16, 8, 0]
    const OUTPUT_TYPES = ['hex']

    const blocks = []

    const createOutputMethod = function (outputType) {
        return function (message) {
            return new Sha1(true).update(message)[outputType]()
        }
    }

    const createMethod = function () {
        const method = createOutputMethod('hex')
        method.create = function () {
            return new Sha1()
        }
        method.update = function (message) {
            return method.create().update(message)
        }
        for (let i = 0; i < OUTPUT_TYPES.length; ++i) {
            const type = OUTPUT_TYPES[i]
            method[type] = createOutputMethod(type)
        }
        return method
    }

    function Sha1 (sharedMemory) {
        if (sharedMemory) {
            blocks[0] = blocks[16] = blocks[1] = blocks[2] = blocks[3] =
                blocks[4] = blocks[5] = blocks[6] = blocks[7] =
                    blocks[8] = blocks[9] = blocks[10] = blocks[11] =
                        blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0
            this.blocks = blocks
        } else {
            this.blocks = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        }

        this.h0 = 0x67452301
        this.h1 = 0xEFCDAB89
        this.h2 = 0x98BADCFE
        this.h3 = 0x10325476
        this.h4 = 0xC3D2E1F0

        this.block = this.start = this.bytes = this.hBytes = 0
        this.finalized = this.hashed = false
        this.first = true
    }

    Sha1.prototype.update = function (message) {
        if (this.finalized) {
            return
        }
        const notString = typeof (message) !== 'string'
        if (notString && message.constructor === window.ArrayBuffer) {
            message = new Uint8Array(message)
        }
        let code
        let index = 0
        let i
        const length = message.length || 0
        const blocks = this.blocks

        while (index < length) {
            if (this.hashed) {
                this.hashed = false
                blocks[0] = this.block
                blocks[16] = blocks[1] = blocks[2] = blocks[3] =
                    blocks[4] = blocks[5] = blocks[6] = blocks[7] =
                        blocks[8] = blocks[9] = blocks[10] = blocks[11] =
                            blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0
            }

            if (notString) {
                for (i = this.start; index < length && i < 64; ++index) {
                    blocks[i >> 2] |= message[index] << SHIFT[i++ & 3]
                }
            } else {
                for (i = this.start; index < length && i < 64; ++index) {
                    code = message.charCodeAt(index)
                    if (code < 0x80) {
                        blocks[i >> 2] |= code << SHIFT[i++ & 3]
                    } else if (code < 0x800) {
                        blocks[i >> 2] |= (0xc0 | (code >> 6)) << SHIFT[i++ & 3]
                        blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3]
                    } else if (code < 0xd800 || code >= 0xe000) {
                        blocks[i >> 2] |= (0xe0 | (code >> 12)) << SHIFT[i++ & 3]
                        blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3]
                        blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3]
                    } else {
                        code = 0x10000 + (((code & 0x3ff) << 10) | (message.charCodeAt(++index) & 0x3ff))
                        blocks[i >> 2] |= (0xf0 | (code >> 18)) << SHIFT[i++ & 3]
                        blocks[i >> 2] |= (0x80 | ((code >> 12) & 0x3f)) << SHIFT[i++ & 3]
                        blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3]
                        blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3]
                    }
                }
            }

            this.lastByteIndex = i
            this.bytes += i - this.start
            if (i >= 64) {
                this.block = blocks[16]
                this.start = i - 64
                this.hash()
                this.hashed = true
            } else {
                this.start = i
            }
        }
        if (this.bytes > 4294967295) {
            this.hBytes += this.bytes / 4294967296 << 0
            this.bytes = this.bytes % 4294967296
        }
        return this
    }

    Sha1.prototype.finalize = function () {
        if (this.finalized) {
            return
        }
        this.finalized = true
        const blocks = this.blocks
        const i = this.lastByteIndex
        blocks[16] = this.block
        blocks[i >> 2] |= EXTRA[i & 3]
        this.block = blocks[16]
        if (i >= 56) {
            if (!this.hashed) {
                this.hash()
            }
            blocks[0] = this.block
            blocks[16] = blocks[1] = blocks[2] = blocks[3] =
                blocks[4] = blocks[5] = blocks[6] = blocks[7] =
                    blocks[8] = blocks[9] = blocks[10] = blocks[11] =
                        blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0
        }
        blocks[14] = this.hBytes << 3 | this.bytes >>> 29
        blocks[15] = this.bytes << 3
        this.hash()
    }

    Sha1.prototype.hash = function () {
        let a = this.h0
        let b = this.h1
        let c = this.h2
        let d = this.h3
        let e = this.h4
        let f
        let j
        let t
        const blocks = this.blocks

        for (j = 16; j < 80; ++j) {
            t = blocks[j - 3] ^ blocks[j - 8] ^ blocks[j - 14] ^ blocks[j - 16]
            blocks[j] = (t << 1) | (t >>> 31)
        }

        for (j = 0; j < 20; j += 5) {
            f = (b & c) | ((~b) & d)
            t = (a << 5) | (a >>> 27)
            e = t + f + e + 1518500249 + blocks[j] << 0
            b = (b << 30) | (b >>> 2)

            f = (a & b) | ((~a) & c)
            t = (e << 5) | (e >>> 27)
            d = t + f + d + 1518500249 + blocks[j + 1] << 0
            a = (a << 30) | (a >>> 2)

            f = (e & a) | ((~e) & b)
            t = (d << 5) | (d >>> 27)
            c = t + f + c + 1518500249 + blocks[j + 2] << 0
            e = (e << 30) | (e >>> 2)

            f = (d & e) | ((~d) & a)
            t = (c << 5) | (c >>> 27)
            b = t + f + b + 1518500249 + blocks[j + 3] << 0
            d = (d << 30) | (d >>> 2)

            f = (c & d) | ((~c) & e)
            t = (b << 5) | (b >>> 27)
            a = t + f + a + 1518500249 + blocks[j + 4] << 0
            c = (c << 30) | (c >>> 2)
        }

        for (; j < 40; j += 5) {
            f = b ^ c ^ d
            t = (a << 5) | (a >>> 27)
            e = t + f + e + 1859775393 + blocks[j] << 0
            b = (b << 30) | (b >>> 2)

            f = a ^ b ^ c
            t = (e << 5) | (e >>> 27)
            d = t + f + d + 1859775393 + blocks[j + 1] << 0
            a = (a << 30) | (a >>> 2)

            f = e ^ a ^ b
            t = (d << 5) | (d >>> 27)
            c = t + f + c + 1859775393 + blocks[j + 2] << 0
            e = (e << 30) | (e >>> 2)

            f = d ^ e ^ a
            t = (c << 5) | (c >>> 27)
            b = t + f + b + 1859775393 + blocks[j + 3] << 0
            d = (d << 30) | (d >>> 2)

            f = c ^ d ^ e
            t = (b << 5) | (b >>> 27)
            a = t + f + a + 1859775393 + blocks[j + 4] << 0
            c = (c << 30) | (c >>> 2)
        }

        for (; j < 60; j += 5) {
            f = (b & c) | (b & d) | (c & d)
            t = (a << 5) | (a >>> 27)
            e = t + f + e - 1894007588 + blocks[j] << 0
            b = (b << 30) | (b >>> 2)

            f = (a & b) | (a & c) | (b & c)
            t = (e << 5) | (e >>> 27)
            d = t + f + d - 1894007588 + blocks[j + 1] << 0
            a = (a << 30) | (a >>> 2)

            f = (e & a) | (e & b) | (a & b)
            t = (d << 5) | (d >>> 27)
            c = t + f + c - 1894007588 + blocks[j + 2] << 0
            e = (e << 30) | (e >>> 2)

            f = (d & e) | (d & a) | (e & a)
            t = (c << 5) | (c >>> 27)
            b = t + f + b - 1894007588 + blocks[j + 3] << 0
            d = (d << 30) | (d >>> 2)

            f = (c & d) | (c & e) | (d & e)
            t = (b << 5) | (b >>> 27)
            a = t + f + a - 1894007588 + blocks[j + 4] << 0
            c = (c << 30) | (c >>> 2)
        }

        for (; j < 80; j += 5) {
            f = b ^ c ^ d
            t = (a << 5) | (a >>> 27)
            e = t + f + e - 899497514 + blocks[j] << 0
            b = (b << 30) | (b >>> 2)

            f = a ^ b ^ c
            t = (e << 5) | (e >>> 27)
            d = t + f + d - 899497514 + blocks[j + 1] << 0
            a = (a << 30) | (a >>> 2)

            f = e ^ a ^ b
            t = (d << 5) | (d >>> 27)
            c = t + f + c - 899497514 + blocks[j + 2] << 0
            e = (e << 30) | (e >>> 2)

            f = d ^ e ^ a
            t = (c << 5) | (c >>> 27)
            b = t + f + b - 899497514 + blocks[j + 3] << 0
            d = (d << 30) | (d >>> 2)

            f = c ^ d ^ e
            t = (b << 5) | (b >>> 27)
            a = t + f + a - 899497514 + blocks[j + 4] << 0
            c = (c << 30) | (c >>> 2)
        }

        this.h0 = this.h0 + a << 0
        this.h1 = this.h1 + b << 0
        this.h2 = this.h2 + c << 0
        this.h3 = this.h3 + d << 0
        this.h4 = this.h4 + e << 0
    }

    Sha1.prototype.hex = function () {
        this.finalize()

        const h0 = this.h0
        const h1 = this.h1
        const h2 = this.h2
        const h3 = this.h3
        const h4 = this.h4

        return HEX_CHARS[(h0 >> 28) & 0x0F] + HEX_CHARS[(h0 >> 24) & 0x0F] +
            HEX_CHARS[(h0 >> 20) & 0x0F] + HEX_CHARS[(h0 >> 16) & 0x0F] +
            HEX_CHARS[(h0 >> 12) & 0x0F] + HEX_CHARS[(h0 >> 8) & 0x0F] +
            HEX_CHARS[(h0 >> 4) & 0x0F] + HEX_CHARS[h0 & 0x0F] +
            HEX_CHARS[(h1 >> 28) & 0x0F] + HEX_CHARS[(h1 >> 24) & 0x0F] +
            HEX_CHARS[(h1 >> 20) & 0x0F] + HEX_CHARS[(h1 >> 16) & 0x0F] +
            HEX_CHARS[(h1 >> 12) & 0x0F] + HEX_CHARS[(h1 >> 8) & 0x0F] +
            HEX_CHARS[(h1 >> 4) & 0x0F] + HEX_CHARS[h1 & 0x0F] +
            HEX_CHARS[(h2 >> 28) & 0x0F] + HEX_CHARS[(h2 >> 24) & 0x0F] +
            HEX_CHARS[(h2 >> 20) & 0x0F] + HEX_CHARS[(h2 >> 16) & 0x0F] +
            HEX_CHARS[(h2 >> 12) & 0x0F] + HEX_CHARS[(h2 >> 8) & 0x0F] +
            HEX_CHARS[(h2 >> 4) & 0x0F] + HEX_CHARS[h2 & 0x0F] +
            HEX_CHARS[(h3 >> 28) & 0x0F] + HEX_CHARS[(h3 >> 24) & 0x0F] +
            HEX_CHARS[(h3 >> 20) & 0x0F] + HEX_CHARS[(h3 >> 16) & 0x0F] +
            HEX_CHARS[(h3 >> 12) & 0x0F] + HEX_CHARS[(h3 >> 8) & 0x0F] +
            HEX_CHARS[(h3 >> 4) & 0x0F] + HEX_CHARS[h3 & 0x0F] +
            HEX_CHARS[(h4 >> 28) & 0x0F] + HEX_CHARS[(h4 >> 24) & 0x0F] +
            HEX_CHARS[(h4 >> 20) & 0x0F] + HEX_CHARS[(h4 >> 16) & 0x0F] +
            HEX_CHARS[(h4 >> 12) & 0x0F] + HEX_CHARS[(h4 >> 8) & 0x0F] +
            HEX_CHARS[(h4 >> 4) & 0x0F] + HEX_CHARS[h4 & 0x0F]
    }

    Sha1.prototype.toString = Sha1.prototype.hex

    return createMethod()
}

seatsio.sha1 = createSha1()

function wasScriptLoadedFromDomains (scriptName, domains) {
    const scripts = document.getElementsByTagName('script')
    return _wasScriptLoadedFromDomains(scriptName, domains, scripts)
}

function _wasScriptLoadedFromDomains (scriptName, domains, allScripts) {
    return domains.some(domain => _wasScriptLoadedFromDomain(scriptName, domain, allScripts))
}

function _wasScriptLoadedFromDomain (scriptName, domain, allScripts) {
    for (let i = 0; i < allScripts.length; ++i) {
        const script = allScripts[i]
        const src = script.src
        if (!src) {
            continue
        }
        if (src.toLowerCase().indexOf(domain) !== -1 && src.indexOf(scriptName) !== -1) {
            return true
        }
    }
    return false
}

function logEventInDatacollector (eventType, metadata, datacollectorUrl) {
    const request = new XMLHttpRequest()
    request.open('POST', datacollectorUrl + '/events')
    request.setRequestHeader('Content-Type', 'application/json')
    request.send(JSON.stringify({ eventType, metadata, url: document.URL }))
}

function amdSupport () {
    return typeof define === 'function' && typeof define.amd === 'object' && define.amd
}

seatsio.removeFromArray = function (obj, arr) {
    const idx = arr.indexOf(obj)
    if (idx > -1) {
        arr.splice(idx, 1)
    }
}

function Optional (val) {
    this.val = val
}

Optional.prototype.isPresent = function () {
    return typeof (this.val) !== 'undefined' && this.val != null
}

function optional (val) {
    return new Optional(val)
}

function undefinedIfNull (value) {
    if (value === null) {
        return undefined
    }
    return value
}

function messageReceived (e) {
    const chartOrChartDesigner = seatsio.getChart(e.source)
    if (!chartOrChartDesigner) {
        return
    }
    const data = JSON.parse(e.data)
    if (chartOrChartDesigner.messageHandlers[data.type]) {
        chartOrChartDesigner.messageHandlers[data.type](e, chartOrChartDesigner, data)
    }
}

function keyboardEvent (e) {
    for (let i = 0; i < seatsio.charts.length; ++i) {
        seatsio.charts[i].handleKey(e)
    }
}

function storageEvent (e) {
    for (let i = 0; i < seatsio.charts.length; ++i) {
        seatsio.charts[i].handleStorageEvent(e)
    }
}

function asJson (object) {
    if (typeof object !== 'object' || object === null) {
        return object
    }

    const json = {}
    Object.keys(object).forEach(key => {
        if (typeof object[key] === 'function') {
            json[key] = object[key].toString()
        } else {
            json[key] = object[key]
        }
    })
    return json
}

seatsio.warn = function (message) {
    if (typeof console !== 'undefined') {
        console.warn(message)
    }
}

seatsio.error = function (message) {
    if (typeof console !== 'undefined') {
        console.error(message)
    }
}

seatsio.MAX_Z_INDEX = 2147483647

function Deferred () {
    this.promise = new Promise((resolve, reject) => {
        this.reject = reject
        this.resolve = resolve
    })
}

Deferred.prototype.then = function (fn) {
    return this.promise.then(fn)
}

const isFirefox = navigator.userAgent.indexOf('Firefox') >= 0


        addEvent('message', messageReceived)
        addEvent('keydown', keyboardEvent)
        addEvent('keyup', keyboardEvent)
        addEvent('storage', storageEvent)

        if (amdSupport()) {
            define([], function () {
                return seatsio
            })
        } else {
            window.seatsio = seatsio
        }

    })()
}