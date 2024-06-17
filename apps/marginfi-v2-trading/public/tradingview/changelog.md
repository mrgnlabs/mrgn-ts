
ℹ️ You can check the Advanced Charts version by executing `TradingView.version()` in a browser console.

<!-- markdownlint-disable no-emphasis-as-header -->
<!-- markdownlint-disable no-inline-html -->
<!-- markdownlint-disable code-block-style -->

## Version 27.006

*Date: Tue May 21 2024*

**Bug Fixes**

- **Resolve quotes with ticker instead of symbol name.** The library will now request quote data using the [`ticker`](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.LibrarySymbolInfo#ticker) property. If `ticker` is not provided in the `LibrarySymbolInfo` object, the `name` property will be used instead. This should resolve an issue some customers were experiencing where quote data was not being properly displayed in the [Watchlist](https://www.tradingview.com/charting-library-docs/latest/trading_terminal/Watch-List) and [Legend](https://www.tradingview.com/charting-library-docs/latest/ui_elements/Legend).

## Version 27.005

*Date: Tue May 07 2024*

**Improvements**

- **Update the Anchored AVWAP drawing.** Add bands settings to the Anchored VWAP drawing.
- **Subscribe to widget bar visibility events.** A new [`study_event`](../api/interfaces/Charting_Library.SubscribeEventsMap.md#study_event) type was added: `widgetbar_visibility_changed`. It returns the visibility state of the widget bar.

**Bug Fixes**

- **Fixed a bug in the Market Status pop-up.** [Corrections](https://www.tradingview.com/charting-library-docs/latest/connecting_data/Extended-Sessions#corrections-for-extended-sessions) specified for the extended session in the [`session-correction`](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.LibrarySubsessionInfo#session-correction) properties were not displayed in the _Market Status_ pop-up window.

## Version 27.004

*Date: Wed Apr 17 2024*

**Breaking Changes**

- **Fixed time parameters in CrossHairMovedEventParams.** In version 26.001, we changed the `time` property of [`CrossHairMovedEventParams`](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.CrossHairMovedEventParams) to be a timestamp in the selected time zone.
In this version, we reverted that change, and `time` represents a UTC timestamp again. Additionally, we introduced a new [`userTime`](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.CrossHairMovedEventParams#usertime) property that represents a timestamp in the selected time zone.

**Improvements**

- **Added ability to disable pulse animation when chart type is set to Line.** New _disable_pulse_animation_ featureset allows users to disable the pulse animation when chart type is set to Line.

**Bug Fixes**

- **Fixed the price scale placement.** The [price scale](https://www.tradingview.com/charting-library-docs/latest/ui_elements/Price-Scale) should be placed back to its original position when a change made through the _Settings_ dialog is canceled. Fixes [#4991](https://github.com/tradingview/charting_library/issues/4991)
- **Fixed the 52 Week High/Low indicator issue.** The 52 Week High/Low indicator no longer adds an empty space to the price scale when less than 52 weeks of historic bars are available. Fixes [#8137](https://github.com/tradingview/charting_library/issues/8137) [#8469](https://github.com/tradingview/charting_library/issues/8469)
- **Only calculate VWAP value when entire anchor period is loaded.** The VWAP indicator will only calculate values for the input anchor period if all bars in that period have been loaded.
- **Fixed a trailing stop modification dialog error.** Fixed a problem where opening the Order Ticket for a trailing stop position caused a "ReferenceError: isPositionLikeItem is not defined" error to be thrown.
- **Fixed the incorrect point position for the Long Position drawing.** The `getPositionPoints()` method will now return correct point positions. Fixes [#8230](https://github.com/tradingview/charting_library/issues/8230)
- **`BREAKING CHANGE` Position line price label does not use the correct price formatter.** The price scale will now correctly reflect the value when a formatter is used with [`createPositionLine`](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.IChartWidgetApi#createpositionline).
Both [`createOrderLine`](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.IChartWidgetApi#createorderline) and [`createPositionLine`](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.IChartWidgetApi#createpositionline) methods behave similarly to the corresponding actions made in the UI via [Order Ticket](https://www.tradingview.com/charting-library-docs/latest/trading_terminal/order-ticket).
Fixes [#8413](https://github.com/tradingview/charting_library/issues/8413) [#8324](https://github.com/tradingview/charting_library/issues/8324)

**Documentation**

- **New User accounts article.** Refer to [User accounts](https://www.tradingview.com/charting-library-docs/latest/trading_terminal/account-manager/user-accounts) for information on how to manage user accounts in the [Account Manager](https://www.tradingview.com/charting-library-docs/latest/trading_terminal/account-manager).
- **Session documentation updates.** The [Symbology](https://www.tradingview.com/charting-library-docs/latest/connecting_data/Symbology#session) and [Extended sessions](https://www.tradingview.com/charting-library-docs/latest/connecting_data/Extended-Sessions) articles now include more information on how to specify sessions and corrections for them.
- **New Save user settings article.** Refer to the [Save user settings](https://www.tradingview.com/charting-library-docs/latest/saving_loading/user-settings) article for information on how to store user settings.
- **Updated Watchlist article.** Explore our latest [Watchlist](https://www.tradingview.com/charting-library-docs/latest/trading_terminal/Watch-List) article that describes how to customize and handle the watchlist's data.

## Version 27.003

*Date: Thu Mar 14 2024*

**Improvements**

- **Added the resetLayoutSizes method.** Use [`resetLayoutSizes`](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.IChartingLibraryWidget#resetlayoutsizes) to reset the sizes of all charts within a multiple-chart layout back to their initial default values. `Trading Platform Only`
- **Added the unloadUnusedCharts method.** The [`unloadUnusedCharts`](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.IChartingLibraryWidget#unloadunusedcharts) method deletes non-visible charts from a multiple-chart layout. Use this method to
prevent the library's inherent behavior to restore previously displayed charts instead of creating new
charts when changing layouts. `Trading Platform Only`
- **Added a new type that reflects the ID of the created indicator.** A new [`study_event`](../api/interfaces/Charting_Library.SubscribeEventsMap.md#study_event) type was added: `create`. It returns the `id` of the newly created indicator.

**Bug Fixes**

- **Displaying volume indicator on chart load when visible_plots_set is not specified.** The chart will now correctly display the volume indicator if the `create_volume_indicator_by_default` featureset is enabled even if the symbols [LibrarySymbolInfo](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.LibrarySymbolInfo) doesn't specify the optional [`visible_plots_set`](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.LibrarySymbolInfo#visible_plots_set) property.
- **Prioritise widget constructor symbol over saved state.** The [`symbol`](../api/interfaces/Charting_Library.ChartingLibraryWidgetOptions#symbol) property in the widget constructor will now have priority over symbols loaded from saved chart states when using [`saved_data`](../api/interfaces/Charting_Library.ChartingLibraryWidgetOptions#saved_data) or [`load_last_chart`](../api/interfaces/Charting_Library.ChartingLibraryWidgetOptions#load_last_chart). Fixes [#7922](https://github.com/tradingview/charting_library/issues/7922) [#8473](https://github.com/tradingview/charting_library/issues/8473) [#7926](https://github.com/tradingview/charting_library/issues/7926) [#8168](https://github.com/tradingview/charting_library/issues/8168)
- **Fixed an issue where the time_frames description was ignored.**

## Version 27.002

*Date: Thu Feb 22 2024*

**Improvements**

- **Add positive and negative filled areas to Spread.** The Spread indicator now has a positive and negative filled area above and below the baseline value of 0. The colors of the filled areas are green and red respectively.

**Bug Fixes**

- **Brush drawing_event is now raising a `create` event when starting drawing.**

**Documentation**

- **Improved drawing documentation.** Explore our latest articles about drawings.
  - New [Drawings API](https://www.tradingview.com/charting-library-docs/latest/ui_elements/drawings/drawings-api) article describes how to manage drawings in the code.
  - Updated [Drawing Overrides](https://www.tradingview.com/charting-library-docs/latest/customization/overrides/Drawings-Overrides) article now includes more information on how to customize drawings.

## Version 27.001

*Date: Fri Feb 2 2024*

**Improvements**

- **Custom indicators can now dynamically hide indicator inputs in the legend when plots are hidden.** The `hideWhenPlotsHidden` option has been added for a custom indicator's input. It enables you to hide an input's value in the legend text when the user hides all of the specified plots.

**Bug Fixes**

- **Allow studies that extend the time scale to load historic bars before the leftmost bar of the main series.**

**Documentation**

- **New articles**
  - [Context menu](https://www.tradingview.com/charting-library-docs/latest/ui_elements/context-menu)
  - [Orders](https://www.tradingview.com/charting-library-docs/latest/trading_terminal/trading-concepts/orders)
  - [Snapshots](https://www.tradingview.com/charting-library-docs/latest/ui_elements/Snapshots)

## Version 27

*Date: Wed Jan 17 2024*

**Breaking Changes**

- **Custom study plot style text property moved.** The chars and shapes custom study plots `text` style property was moved from `metainfo.defaults.styles.[plot id].text` to `metainfo.styles.[plot id].text`. See this GitHub issue for more details [#8184](https://github.com/tradingview/charting_library/issues/8184)
- **Changed context menu behavior of the 'Plus' button and removed the 'show_context_menu_in_crosshair_if_only_one_item' featureset.** Now, the context menu of the *Plus* button opens even if the menu has only one item. Previously, the item's action was immediately executed if there was only one item in the context menu. Additionally, the `show_context_menu_in_crosshair_if_only_one_item` featureset has been removed.

**Breaking Changes: Trading Platform**

- **Changed parameter type in the showPositionDialog method.** The `position` parameter type of the [`showPositionDialog`](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.BrokerCustomUI#showpositiondialog) method in the [`BrokerCustomUI`](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.BrokerCustomUI) interface has been changed to `Position | IndividualPosition`.
- **Renamed flags in the BrokerConfigFlags interface.** The following flags have been renamed in the [`BrokerConfigFlags`](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.BrokerConfigFlags) interface:
  - `supportTrades` flag has been renamed to `supportPositionNetting`;
  - `supportTradeBrackets` flag has been renamed to `supportIndividualPositionBrackets`;
  - `supportCloseTrade` flag has been renamed to `supportCloseIndividualPosition`;
  - `supportPartialCloseTrade` flag has been renamed to `supportPartialCloseIndividualPosition`;
  - `requiresFIFOCloseTrades` flag has been renamed to `requiresFIFOCloseIndividualPositions`.
- **Renamed TradeBase and Trade interfaces.** The `TradeBase` interface has been renamed to [`IndividualPositionBase`](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.IndividualPositionBase) and the `Trade` interface has been renamed to  [`IndividualPosition`](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.IndividualPosition) respectfully.
All fields and their types has been left unchanged.
- **Renamed tradeColumns field in the AccountManagerInfo interface.** The `tradesColumns` field in the [AccountManagerInfo](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Broker.AccountManagerInfo) interface has been renamed to `individualPositionColumns`.
- **Renamed Trade member to IndividualPosition in the ParentType enum.** The `Trade` member of the [`ParentType`](https://www.tradingview.com/charting-library-docs/latest/api/enums/Charting_Library.ParentType) enum has been renamed to `IndividualPosition`.
- **Renamed trade related methods in the IBrokerConnectionAdapterHost interface.** The following methods in the [`IBrokerConnectionAdapterHost`](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.IBrokerConnectionAdapterHost) have been changed:
  - the `tradeUpdate` method has been renamed to [`individualPositionUpdate`](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.IBrokerConnectionAdapterHost#individualpositionupdate). The `trade` parameter of the method has been renamed to `individualPosition`. Also, the type of that parameter has been changed to `IndividualPosition`;
  - the `tradePartialUpdate` method has been renamed to [`individualPositionPartialUpdate`](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.IBrokerConnectionAdapterHost#individualpositionpartialupdate). The type of the `changes` parameter has been changed to `Partial<IndividualPosition>`;
  - the `tradePLUpdate` method has been renamed to [`individualPositionPLUpdate`](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.IBrokerConnectionAdapterHost#individualpositionplupdate);
  - the type of the `position` parameter of the [`showPositionBracketsDialog`](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.IBrokerConnectionAdapterHost#showpositionbracketsdialog) method has been changed to `Position | IndividualPosition`.
- **Renamed methods in the IBrokerWithoutRealtime interface.** The following changes have been made in the [`IBrokerWithoutRealtime`](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.IBrokerWithoutRealtime) interface:
  - The `closeTrade` method has been renamed to `closeIndividualPosition`;
  - The `editTradeBrackets` method has been renamed to `editIndividualPositionBrackets`.
- **Renamed trade method in the IBrokerCommon interface.** The `trades` method in the [`IBrokerCommon`](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.IBrokerCommon) has been renamed to `individualPositions`. The return type of that method has been changed to `Promise<IndividualPosition[]>`.
- **Removed the Order Panel button from the right toolbar.** To open [_Advanced Order Ticket_](https://www.tradingview.com/charting-library-docs/latest/trading_terminal#advanced-order-ticket), users should use the _Trade_ button in _Account Manager_ now.

**New Features**

- **Enabled in-place editing in Legend.** Users can change a symbol and resolution right from the [_Legend_](https://www.tradingview.com/charting-library-docs/latest/ui_elements/Legend) now. [#7966](https://github.com/tradingview/charting_library/issues/7966)
- **Added Quick Search.** The _Quick Search_ dialog allows users to search for drawings, UI settings, and functions, such as _Remove Indicators_.
To open this dialog, users should click the _Quick Search_ button on the top toolbar or use the _Ctrl/Cmd_ + _K_ shortcut.
- **Added ability to show daily change in the chart legend.** New _Last day change values_ option allows users to show/hide the last day change values in the main series legend.
To make this option available in the _Chart Settings_ dialog, use the [`legend_last_day_change`](https://www.tradingview.com/charting-library-docs/latest/customization/Featuresets#legend_last_day_change) featureset. [#8193](https://github.com/tradingview/charting_library/issues/8193)
- **Updated drawing icons.** New icons for the _Text_, _Anchored Text_, _Note_, and _Anchored Note_ drawings. [#8181](https://github.com/tradingview/charting_library/issues/8181)
- **Drawings can now be saved separately to the chart layout**. See [Saving Drawings Separately](https://www.tradingview.com/charting-library-docs/latest/saving_loading/saving_drawings_separately) for more details.

**Improvements**

- **`BREAKING CHANGE` Refactoring of the Ichimoku Cloud indicator.** Following feedback we've re-written the Ichimoku indicator and have brought the following changes:
  - 'Leading Span B' input is now 'Leading Span Periods'.
  - 'Lagging Span' input is now 'Lagging Span Periods'.
  - 'Leading Shift Periods' is a brand new input that aligns better to the original definition of the indicator.
  - Previously, 'Lagging span' was shifting both cloud and lagging lines. This should no longer apply as 'Leading Shift Periods' now handles the offset change for 'Lagging Span'.
- **`BREAKING CHANGE` Inputs renaming for Stochastic indicator.** Inputs for the Stochastic indicator have been renamed for consistency across our products.
- **`BREAKING CHANGE` Broker API clean up.** `Trading Platform Only` The `positionDialogOptions` object has been removed from the Broker's Configuration. Please use the `getPositionDialogOptions` method to customize the Position dialog.
- **Added new keyboard navigation shortcut.** Starting from version [26.002](https://www.tradingview.com/charting-library-docs/latest/releases/release-notes#version-26002), the library supports a keyboard navigation activated via the _Alt/Opt_ + _Z_ shortcut. Now, you can change this default navigation shortcut to _Tab_. To do this, enable the new  [`accessible_keyboard_shortcuts`](https://www.tradingview.com/charting-library-docs/latest/customization/Featuresets#accessible_keyboard_shortcuts) featureset. For more information, refer to [Keyboard navigation](https://www.tradingview.com/charting-library-docs/latest/getting_started/accessibility#keyboard-navigation).
- **Added ability to cancel order dragging by pressing Esc.** If a user presses _Esc_ while dragging the order, the order will be returned to its initial position.

**Bug Fixes**

- **Market status text during pre-market and post-market sessions.** The countdown text in the market status pop-up tooltip (in the legend area) has been fixed for pre-market and post-market sessions. The market status icon now shows an orange sunrise icon for pre-market and a blue moon icon for post-market.
- **Floating drawing toolbar context menu.** It wasn't possibly to override the context menu for the floating drawing toolbar.
- **Missing translation for No data here.** No data here message that is displayed on the chart whenever no bars are returned for a given symbol was missing its translation.
- **Disabling the 'open_account_manager' featureset now works as expected.** `Trading Platform Only`
- **Order Panel Custom Input Fields Reactivity.** `Trading Platform Only` The reactivity of UI elements within the order panel when using custom fields has been improved (Fixes [#6607](https://github.com/tradingview/charting_library/issues/6607)).
- **Fixed the pane buttons on the collapsed pane.** The pane buttons used to overlap the _Scroll to the Most Recent Bar_ button when the pane is collapsed. [#8213](https://github.com/tradingview/charting_library/issues/8213)
- **The precision setting can be applied to all charts now.** To do this, users should specify precision in the _Chart settings_ dialog and click the _Apply to all_ button. [#8343](https://github.com/tradingview/charting_library/issues/8343) `Trading Platform Only`
- **Fix the color of high/low price label.** Now, the color of high/low labels on the price scale corresponds to the color of the high/low lines. Users can specify this color in the _Chart settings_ dialog. [#8255](https://github.com/tradingview/charting_library/issues/8255)

**Documentation**

- **Chart customization precedence article added.** The library offers multiple approaches for changing the chart appearance and behavior.
Explore our latest article on [customization precedence](https://www.tradingview.com/charting-library-docs/latest/customization/customization-precedence)
for a comprehensive understanding of customization methods/properties and the sequence in which they are applied.
- **Order Ticket dialog article added.** Refer to [Order Ticket](https://www.tradingview.com/charting-library-docs/latest/trading_terminal/order-ticket) to learn how to provide custom fields, enable an order preview, implement your custom Order Ticket, and more.
- **New how-to guide on metainfo.** Explore our latest [guide](https://www.tradingview.com/charting-library-docs/latest/tutorials/create-custom-indicator/metainfo-implementation) on how to implement the `metainfo` field when you create a custom indicator. For more information about custom indicators and `metainfo`, refer to the updated [Custom indicators](https://www.tradingview.com/charting-library-docs/latest/custom_studies) and [Metainfo](https://www.tradingview.com/charting-library-docs/latest/custom_studies/metainfo) articles.
- **Bracket orders article added.** Explore our latest article on [bracket orders](https://www.tradingview.com/charting-library-docs/latest/trading_terminal/trading-concepts/brackets) in Trading Platform.
- **Account Manager article added.** Refer to [Account Manager](https://www.tradingview.com/charting-library-docs/latest/trading_terminal/account-manager) for more information on creating pages, customizing columns, and configuring the Account Manager behavior.
- **Accessibility article added.** Refer to the new [Accessibility](https://www.tradingview.com/charting-library-docs/latest/getting_started/accessibility) article for information about accessibility features that the library includes.
- **Other documentation updates.** The new documentation version includes:
  - Updated [Resolution](https://www.tradingview.com/charting-library-docs/latest/core_concepts/Resolution) and [Price Scale](https://www.tradingview.com/charting-library-docs/latest/ui_elements/Price-Scale) articles.
  - A full list of overrides for built-in indicators. Refer to the [Indicator Overrides](https://www.tradingview.com/charting-library-docs/latest/customization/overrides/Studies-Overrides#list-of-overrides) article for information.

**Other**

- **`BREAKING CHANGE` Deprecated customFormatters and brokerFactory.** Use [`custom_formatters`](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.ChartingLibraryWidgetOptions#custom_formatters)
and [`broker_factory`](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.TradingTerminalWidgetOptions#broker_factory) instead.
- **`BREAKING CHANGE` Deprecated RawStudyMetaInfo.precision.** Use the [`format`](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.RawStudyMetaInfo#format) property instead. For more information, refer to the [Metainfo](https://www.tradingview.com/charting-library-docs/latest/custom_studies/metainfo) article.

## Version 26.004

*Date: Thu Nov 16 2023*

**New Features**

- **Add methods to handle trading quantity.** The broker API now exposes a getter [getQty](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.IBrokerConnectionAdapterHost#getqty) and a setter [setQty](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.IBrokerConnectionAdapterHost#setqty) along with a subscription [subscribeSuggestedQtyChange](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.IBrokerConnectionAdapterHost#subscribesuggestedqtychange) and its dependant to unsubscribe [unsubscribeSuggestedQtyChange](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.IBrokerConnectionAdapterHost#unsubscribesuggestedqtychange).

**Improvements**

- **Added anchor option to VWAP indicator.** The VWAP indicator now has input options for source and anchor.
  - Source allows customisation of the price source for the indicator. Defaults to `hlc3`.
  - Anchor period setting specifies how frequently the VWAP calculation will be reset. This  Defaults to `'Session'`.

**Bug Fixes**

- **VWAP Indicator behaviour.** The default behaviour for the VWAP indicator has been fixed. Previously it would anchor to the earliest available data point instead of the start of each session.
- **Displaying DOM widget data on non-tradable symbols.** `Trading Platform Only` When a symbol is non-tradable (`isTradable()` in the Broker API is returning `false`) it is now possible to display depth data in the DOM widget provided via the datafeed.
- **The price source text is visible in the screenshot.**
- **Fix display of price sources in Overlay study.** Price sources for symbols in the Overlay study were not being shown when the main series symbol did not have the same price source
- **Both Trend Strength Index and Linear Regression Slope indicators were missing their zero-based property to properly plot them using a histogram.**
- **onChartReady inconsistency on Safari.** Fixed an issue where `onChartReady` wouldn't reliably get called on specific versions of Safari.

**Documentation**

- **New article on core trading concepts.** We have added a new article describing [trading concepts](https://www.tradingview.com/charting-library-docs/latest/trading_terminal/trading-concepts) in Trading Platform.
Learn how to integrate trading functionality into your application using the Broker API and Trading Host.

## Version 26.003

*Date: Thu Oct 05 2023*

**Bug Fixes**

- **Do not save to localstorage when the use_localstorage_for_settings feature is disabled.** Fixed a bug where use_localstorage_for_settings did not stop some settings from being saved to localstorage.
- **Disabling `drawing_templates` completely removes the ability to save it when using line tools.**
- **Renaming a section within watchlist was throwing an error.**
- **Fixed an issue where it wasn't possible to set the background colour of a Renko bar to transparent.**

## Version 26.002

*Date: Mon Sep 18 2023*

**Improvements**

- **IOrderLineAdapter and IPositionLineAdapter now support positioning with pixel units.** The
[setLineLength](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.IOrderLineAdapter#setlinelength)
method in the IOrderLineAdapter (returned by
[createOrderLine](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.IChartWidgetApi#createorderline))
and IPositionLineAdapter
([createPositionLine](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.IChartWidgetApi#createpositionline))
interfaces now support setting the unit to `'pixel'`.
  - Additionally, when using pixel unit, you can specify a negative number to
  position from the left edge of the chart instead.
- **Added keyboard navigation.** Keyboard navigation (activated via alt/opt + z keyboard shortcut) and many other accessability improvements have been added to the library.
  - A featureset [accessibility](https://www.tradingview.com/charting-library-docs/latest/customization/Featuresets#accessibility) (on by default) has been added to control this behaviour.
- **Menu name is provided to items_processor (context menu API).** [items_processor](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.ContextMenuOptions#items_processor) within the [context_menu](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.ChartingLibraryWidgetOptions#context_menu) API now includes details about the name of menu, and the ids of the related item (such as the series, drawing, study, order, or position).
- **Support more kinds of extended sessions.** The library now supports specifying only one of the postmarket or premarket sessions without the other.

**Bug Fixes**

- **On mobile devices, fixed an issue for when scrolling the pricescale with one finger while another one was holding the crosshair.**
- **Fixed an issue where it wasn't possible to set the background colour of a candle to transparent.**
- **52 Week High/Low indicator compatibility with empty supported_resolutions array.** Fixes [#7884](https://github.com/tradingview/charting_library/issues/7884) issue.
- **Fixed an issue where any added indicator on the chart couldn't be undone.**
- **Fixed issue with locking visible time range while resizing chart.** When resizing the chart window with percentage right margin, and the `lock_visible_time_range_on_resize` featureset enabled then the visible range wasn't locked correctly.
- **SuperTrend Indicator Starting Point.** The SuperTrend would previously start drawing from zero for the first bar, instead of only drawing the indicator after the initial length (defined in the indicator's inputs) when all the possible data for a symbol has been loaded.
- **Changing the LineStyle for a position is again available.**
- **Styles tab for Pivot Point Standard indicator.** Resolved an issue where the style tab for the Pivot Point Standard indicator would not function correctly when the type option was set to 'Floor'.

**Other**

- **Custom Translation Function.** The following changes have been made to the [custom_translate_function](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.ChartingLibraryWidgetOptions#custom_translate_function)
  - The interface name for the options has changed from `TranslateOptions` to `CustomTranslateOptions`.
  - The `plural` field in `CustomTranslateOptions` can now be either a single string, or an array of strings.
  - A third boolean argument is now provided. When this is true then the key provided is already translated.

## Version 26.001

*Date: Tue Aug 08 2023*

**New Features**

- **Add series and study values to crosshair move event.** The [`crossHairMoved` subscription](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.IChartWidgetApi/#crosshairmoved) now exposes the study and series values in the event object. The values are the same as the values shown in the data window.
- **Adding a new Floor type for calculating Pivot.**
- **Add the onHoveredSourceChanged method to the widget API.** See [`onHoveredSourceChanged`](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.IChartWidgetApi/#onhoveredsourcechanged).

**Improvements**

- **Added optional variable_tick_size property to symbol info.**
- **Added onMoving to the Order Line Adapter.** [onMoving](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.IOrderLineAdapter#onmoving)

**Bug Fixes**

- **Selecting an incorrect symbol within a study no longer prevents the study from recovering when a valid symbol is chosen later.**
- **Fix drawing tools not affecting undo/redo stack and chart layout saving buttons.** Drawing actions can now be undone/redone and will affect the saving of the chart layout
- **Disabling the 'open_account_manager' featureset now works as expected.**

**Other**

- **Watchlist sections featureset added for adjusting the visibility of the 'Add Section' button.** The UI for creating watchlist sections can now be hidden by disabling the [watchlist_sections](https://www.tradingview.com/charting-library-docs/latest/customization/Featuresets#watchlist_sections) featureset.

## Version 26

*Date: Tue Jul 18 2023*

**Breaking Changes**

- **Remove Lines item and submenu from background and symbol context menu.** The "lines" item has been removed from the context menu of the chart and the legend of the main series.

**New Features**

- **In bottom toolbar, tooltip text for date ranges has changed.** Hovering over the time frame buttons will provide more details to understand how chart is constructed.
- **Add setting for visibility of A (auto) and L (log) scale buttons.** In Chart settings, Scale tab, a new setting has been introduced to enable shortcuts for Auto & Logarithmic modes.
- **Bug in compare data displayed in Data window.** There was an issue where OHLC values would only be displayed in the data window widget when using the cross hair selection instead of displaying the data from the latest available bar if nothing was selected. Fixes [#7769](https://github.com/tradingview/charting_library/issues/7769)
- **Update chart maximization icon and remove animation.** Maximization button restyled
- **Price scale resizing while scrolling chart in mobile browser.** When scrolling into history the price scale expands to accommodate the values, but doesn't retract when the values become shorter. This is done to make the scale less twitchy during scrolling. The scale's width is reset on data loading.

**Improvements**

- **Fixed a bug where on some DPR there was no separator between the right widget panel and the order panel.** Now the separator line is always visible.
- **No bracket settings in chart settings.** Bracket settings were added to the Chart settings in the Trading tab.
- **Symbol logos within the Legend and Account Manager.** Symbol logos can now be displayed within the [Legend](https://www.tradingview.com/charting-library-docs/latest/ui_elements/Legend#displaying-logos-within-the-legend) and the Account Manager panel (`Trading Platform Only`) if the `show_symbol_logos` featureset is enabled.
  - `show_symbol_logo_in_legend` featureset can be disabled to hide the logos within the legend.
  - `show_symbol_logo_for_compare_studies` featureset can be disabled to hide the logos within the legend for compare overlay studies.
  - `show_symbol_logo_in_account_manager` featureset can be disabled to hide the logos within the Account Manager panel (`Trading Platform Only`).
- **Added setter and getter methods for CSS custom properties defined within the iframe.** The widget API now includes [setCSSCustomProperty](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.IChartingLibraryWidget#setcsscustomproperty) and [getCSSCustomPropertyValue](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.IChartingLibraryWidget#getcsscustompropertyvalue) methods for controlling CSS custom properties within the chart's iframe element.

**Other**

- **Deprecated properties and methods.** The following properties and methods are marked as deprecated and will be removed in the next major release:
  - `customFormatters` in the [ChartingLibraryWidgetOptions](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.ChartingLibraryWidgetOptions) interface. Use [`custom_formatters`](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.ChartingLibraryWidgetOptions/#custom_formatters) instead.
  - `customFormatters` and `brokerFactory` in the [TradingTerminalWidgetOptions](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.TradingTerminalWidgetOptions) interface. Use [`custom_formatters`](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.TradingTerminalWidgetOptions/#custom_formatters) and [`broker_factory`](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.TradingTerminalWidgetOptions/#broker_factory) instead.

## Version 25.002

*Date: Wed Jul 12 2023*

**New Features**

- **Add 52 Week High/Low study.**
- **Enable hiding price scales when all studies or series are hidden.** Adds the `hide_price_scale_if_all_sources_hidden` feature. When enabled price scales will be hidden when all studies (or the main series) attached to the price scale are hidden.
- **Option to always show legend values for studies on mobile.** By default, when on mobile, the legend won't display any values for studies.
Enabling this new `always_show_legend_values_on_mobile` featureset allows you to display the values.

**Improvements**

- **Sections can now be added within the Watchlist.** Sections dividers can now be added within the watchlist (`Trading Platform Only`).
  - Any item within a list which is prefixed with `###` will be considered a section divider. [API Reference](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.IChartingLibraryWidget#watchlist)
- **Symbol and exchange logos can now be shown within the Compare Dialog.** The [symbol info](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.LibrarySymbolInfo) provided by [resolveSymbol](https://www.tradingview.com/charting-library-docs/latest/connecting_data/Datafeed-API#resolvesymbol) should now include 'exchange_logo' if you would like to use the 'show_exchange_logos' featureset.

**Bug Fixes**

- **Watermark API's content provider is now used for all charts within a multi-chart layout.**
- **Fixed issue with resetData.** When resetting the data for a chart, any existing studies would become unlinked from the data source. Fixes [#7802](https://github.com/tradingview/charting_library/issues/7802)
  - The `request_only_visible_range_on_reset` featureset now defaults to `disabled`.

## Version 25.001

*Date: Mon Jun 26 2023*

**Breaking Changes**

- **price_sources moved to symbol info.** To allow price sources resolved on-demand with the associated symbol the `price_sources` property has been removed from [the datafeed configuration object](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.DatafeedConfiguration) and added to the [symbol info object](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.LibrarySymbolInfo).

**New Features**

- **Added Market status state getter.** [marketStatus](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.IChartWidgetApi#marketstatus) method is provided within [IChartWidgetApi](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.IChartWidgetApi) which returns a watched value of the charts symbols current [market status](https://www.tradingview.com/charting-library-docs/latest/api/enums/Charting_Library.MarketStatus).
- **Symbol and exchange logos.** It is now possible to specify logo images for symbols and exchanges. These will be visible within the search dialog, and watchlist (Trading Platform). The `show_symbol_logos` and `show_exchange_logos` featuresets should be enabled, and your datafeed should be updated to provide urls as part of the symbol info supplied by the `resolveSymbol` method, and results supplied by the `searchSymbols` method.
- **Enable custom studies to extend the time scale.** Enable custom studies to extend the time scale with points that don't exist in the main series.
  - [See this article for more info](https://www.tradingview.com/charting-library-docs/latest/custom_studies/Studies-Extending-The-Time-Scale)
- **Added Custom Symbol Status API.** The new [Custom Symbol Status API](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.ICustomSymbolStatusApi) enables the creation and customisation of an additional status to be displayed for the symbol within the legend area.
  - The Custom Symbol Status API can be accessed via the [`customSymbolStatus`](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.IChartingLibraryWidget#customsymbolstatus) method on the chart widget.
  - An example is provided on the [Symbol Status](https://www.tradingview.com/charting-library-docs/latest/ui_elements/Symbol-Status) page.
- **Featureset added for clearing the price scale on errors.** Added new `clear_price_scale_on_error_or_empty_bars` featureset to automatically clear pane price scales when the main series has an error or has no bars.
- **Adding Anchored VWAP in Trend line tools.** A new Trend line tool has been added to the already long list: Anchored VWAP.

**Improvements**

- **Added Watermark API.** The new [Watermark API](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.IWatermarkApi) enables the customisation of the watermark text in addition to providing [WatchedValues](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.IWatchedValue) for the color and visibility properties.
  - The Watermark API can be accessed via the [`watermark`](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.IChartingLibraryWidget#watermark) method on the chart widget.
- **Updated broker API sample to support bracket orders.** The sample broker API has been updated to support brackets (stop loss, and take profit) orders. `Trading Platform Only`
- **Drawings in saved charts now restore with the saved settings for lock and disableSelection.** The `lock` and `disableSelection` settings for a created shape will now be saved and restored correctly. [#6761](https://github.com/tradingview/charting_library/issues/6761)
- **Fullscreen button can now be used to exit fullscreen mode as well.** When using the `header_in_fullscreen_mode` featureset, it is now possible to use the fullscreen button to exit fullscreen mode.
- **Added method to programmatically set the time frame for the active chart.** The [setTimeFrame](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.IChartWidgetApi#settimeframe) method has been added to the widget which can set the time frame in a similar manner to the [Timeframes at the bottom of the chart](https://www.tradingview.com/charting-library-docs/latest/ui_elements/Time-Scale#timeframes-at-the-bottom-of-the-chart) buttons.
- **Renaming precision dropdown values in Chart settings.** To limit confusion when dealing with the Chart settings/Precision dropdown values, some fractional ones have been renamed to more readable ones.
- **Changing Source option in line-break & renko chart.** In Trading Platform, it was unnecessary to offer the option to change the source of data for both Renko and Line Break, as the data is taken from the close value.

**Bug Fixes**

- **Timescale marks will adjust correctly when widget theme is changed.**
- **onAutoSaveNeeded event emitted when removing all drawings via toolbar button.**
- **removeChart within the save load adapter will await the promise before updating the UI.**
- **First getBars request after resetting data no longer has a countback of zero.**
- **Market status pop up text could sometimes display Infinity or NaN values and not update on the dot.**
- **Fix custom field validators.** Fixes a bug where custom broker field validator functions were not called if provided.
- **Fixed rendering on price and time axes when a Trend Angle line drawing is selected.**

**Other**

- **Changed validation warning message within the close position UI.** Message changed from 'Specified value is more than the instrument maximum' to 'The amount entered exceeds the position size'.
- **Corrected the strings for the ThemeName type definition.** The possible values should have been lowercase: 'dark' & 'light'.
- **Moved Session breaks from Events to Appearance tab in chart options.** This reverts a breaking change made in `v25.0`.
- **Adding snippets for Trading Platform datafeed methods.** Some functions were lacking an out of the box snippet to use within their application.

## Version 25

*Date: Mon May 22 2023*

**Breaking Changes**

- **Save and Load Chart Templates.** Add methods to the [save/load adapter](https://www.tradingview.com/charting-library-docs/latest/saving_loading) to support chart templates.
- **Renew design for send order and buy sell buttons.** Renew design for send order and buy sell buttons:
  - Buttons are now rounded
  - Selected item and underline are now black
- **New TV logo.** What is changing:
  - Changing the size, boldness of the text
  - Indentation of the logo from the borders of the chart
- **One row for grid lines settings.** The grid lines settings have been combined into one row.
- **Remove magnet icon near cursor - Reverting feature.** Following reviews this piece of work was reverted.
- **Update Advanced Charts branding.** Branding font and position is slightly changed.
- **Do not load Euclid font for the branding logo on chart.** The Euclid font will not load if there is an animated logo on the chart.
- **When the chart data is reset, the new request for data will only be for the visible range.** The previous behavior was that when [resetData](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.IChartWidgetApi#resetdata) was evoked, that the datafeed would be requested to provide data for the entire range of data already loaded for that symbol. The new behavior is that the request is now only for the current visible range. This more closely matches the behavior of the first load. If you require the old behavior then you can disable the `request_only_visible_range_on_reset` featureset.
- **Remove timezone & session breaks section from scale gear menu.** Time zone and Session breaks section has been removed from gear menu.
- **Update chart types icons.** Changed icons for Line, Area and Baseline chart types.
- ~~**Move Session breaks from Appearance to Events tab.** Session breaks setting is moved to events tab.~~ (Reverted in v25.001)
- **Changed the gear icon.** Changed the icon for price scale settings button ('gear' in bottom-right corner). See [#7666](https://github.com/tradingview/charting_library/issues/7666)
- **Chart navigation buttons.** Navigation buttons at the bottom of the chart have a slightly new design.

**New Features**

- **Adding a new chart type HLC Area.** HLC Area is a new chart type available.
- **Handle variable-tick-size.** Added support for variable tick size.
- **Add new stats position for info line drawing "auto".** Option of automatic positioning of information block for infoline drawings was added "auto" (in addition to existing left, center, right).
- **Add new checkboxes for price range in Info Line drawing box.** Added 2 settings in linetools context menu:
  - Percent change
  - Change in pips
- **Add ability to move anchors continuously - not by bars.** Smooth resizing of icons, stickers and emojis was implemented.
- **Correct Chart settings text Price scale labels.** "LABELS" group in "Scales" tab of Chart settings has been renamed to "LABELS ON PRICE SCALE".
- **Show + button on cursor by hotkey.** Added hotkeys Alt+Ctrl (win) or Opt+Command (mac) for the appearance of the plus button under the cursor.
- **Add Data window item to context/legend three dots menu.** Added new item to context/legend three dots menu - "Data window..." with a shortcut. Opens Data Window in the right panel.
- **Add Volume profile indicators on the top of chart series.** Changed the default z-order for Volume Profile indicators and VP drawings. They are now located above the main series.
- **Added new time zone Anchorage Alaska.** Added new time zone Anchorage Alaska (UTC-9).
- **Separate chart types Line with markers and Stepline.** Step line and Line with markers types are added to the top toolbar chart types menu.
- **Added new time zone Casablanca.** Timezone Casablanca (UTC) has been added.
- **Try to load line tools code dynamically.** Fixed floating toolbar for Price Note to show color and text settings like for other drawings.
- **Add sticker drawing tool.** Add the ability to use stickers with `createMultipointShape` or `selectLineTool`.
- **Add Accelerator Oscillator indicator.**

**Improvements**

- **Theming support for pop-up menus.** Additional CSS custom properties have been added for styling pop-up menus. Pop-up (as known as 'pop-over') menus include toolbar menus, and context menus. See the full list of CSS custom properties in the [CSS Color Themes](https://www.tradingview.com/charting-library-docs/latest/customization/styles/CSS-Color-Themes) article.
- **Add date and time input UI for custom studies.** [Custom studies](https://www.tradingview.com/charting-library-docs/latest/custom_studies) now support defining inputs of the `'time'` type and having a GUI element (date and time pickers) in the indicators settings dialog window.
- **setActiveChart added to the Widget API.** The currently active chart in a multi-chart layout (available on Trading Platform only) can now be changed using the `setActiveChart` method. [more info](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.IChartingLibraryWidget#setactivechart)

**Bug Fixes**

- **Include missing PriceAxisLastValueMode and LineStyle enums in type documentation.**

**Documentation**

- **The Overrides article update.** We have updated the [Overrides](https://www.tradingview.com/charting-library-docs/latest/customization/overrides) article. Now it contains general information about the Overrides API. For information on how to customize elements on the chart, refer to a new [Chart Overrides](https://www.tradingview.com/charting-library-docs/latest/customization/overrides/chart-overrides) article.

## Version 24.004

*Date: Mon Apr 24 2023*

**New Features**

- **Indicators can now be favorited.** Indicators can now be favorited by tapping on the star icon to the left of the
indicator name. Favorited indicators will appear at the top of the indicator
list.
  - The `items_favoriting` featureset should be enabled. [more info](https://www.tradingview.com/charting-library-docs/latest/customization/Featuresets)
- **Adding two featuresets to hide the right_toolbar or its tabs.** There are 2 new featuresets `hide_right_toolbar` & `hide_right_toolbar_tabs` plus an additional WidgetBar API [changeWidgetBarVisibility](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.IWidgetbarApi#changeWidgetBarVisibility) to control the right toolbar.
  - `hide_right_toolbar` allows you to instantiate the toolbar without showing it in the UI.
  - `hide_right_toolbar_tabs` will do the same with the exception of not showing tabs when displaying the right toolbar.

**Improvements**

- **Added a middle band for the RSI indicator.** Unlike on tradingview.com RSI was not presenting the option to plot a middle limit.
- **Indicators favorites can now be defined within widget constructor.** Indicators can now be defined as favorites using the [`favorites`](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.ChartingLibraryWidgetOptions#favorites) property of the widget constructor options. See [Favorites.indicators](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.Favorites#indicators) for more information.
- **Add a way to independently clear bar marks/timescale marks.** [`clearMarks`](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.IChartWidgetApi#clearmarks) method has been enhanced to pass in an option to choose which marks should be cleared on the chart.
  - By default behaviour will remain similar and both bar & TimeScale marks will be removed.
  - Passing `ClearMarksMode.BarMarks` will only remove bar marks.
  - Passing `ClearMarksMode.TimeScaleMarks` will only remove TimeScale marks.
- **`BREAKING CHANGE` Discrepancy in chart style/type methods.** Only TypeScript breaking change as an interface has been renamed to better reflect its purpose.
`SeriesStyle` is now [SeriesType](https://www.tradingview.com/charting-library-docs/latest/api/enums/Charting_Library.SeriesType).

**Bug Fixes**

- **load_study_template event is not emitted.** load_study_template event was not emitted when applying a template on the chart.
- **Fixed autosize bug occurring on Chrome iOS when rotating the device.** Workaround fix for a browser bug until Chrome resolves the issue on their side.
- **Fixed the type definitions for a few of the PineJS Std library functions.** [PineJSStd documentation](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.PineJSStd).

**Documentation**

- **New Key Features article.** We have added the [Key Features](https://www.tradingview.com/charting-library-docs/latest/getting_started/Key-Features) article that lists features supported/unsupported in Advanced Charts and Trading Platform.
- **How to connect data via Datafeed API.** We have added a new [tutorial on connecting data via Datafeed API](https://www.tradingview.com/charting-library-docs/latest/tutorials/implement_datafeed_tutorial/).
It will help you implement datafeed and real-time data streaming to Advanced Charts step-by-step.

**Other**

- **Incorrect watermark property key.** Deprecated `symbolWatermarkProperties` property has now been removed.
Please use [settings_adapter](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.ChartingLibraryWidgetOptions#settings_adapter) with `symbolWatermark` key instead or `applyOverrides` to change values.

## Version 24.003

*Date: Tue Apr 11 2023*

**New Features**

- **Images within bar marks.** Bar marks now support the rendering of images as the background by specifying the `imageUrl` property. Please see the [Mark](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.Mark) interface for more details.
- **Price Source and Long Description symbol info fields.** Add support for displaying the price source and long description fields from the symbol info.
  - To enable the price source first add `symbol_info_price_source` to the list of enabled features. Then it will be shown in the legend, if available. It can be hidden through the legend context menu and the series property dialog.
  - To enable the long description first add `symbol_info_long_description` to the list of enabled features. Then it will be shown in the legend, if available. It can be hidden through the legend context menu and the series property dialog.

**Improvements**

- **Added more styling options for bar marks.** The styling options for bar marks has been expanded to include options for styling the border.
  - Border color can be set using the `border` property within `color` of the Mark interface. See [MarkCustomColor](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.MarkCustomColor)
  - Border width can be set using `borderWidth` and `hoveredBorderWidth`. See [Mark](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.Mark)
- **Drawing tools favorites can now be defined within widget constructor.** Drawing tools can now be defined as favorites using the [`favorites`](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.ChartingLibraryWidgetOptions#favorites) property of the widget constructor options. See [Favorites.drawingTools](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.Favorites#drawingtools) for more information.
- **Context menu API can now be used within the Watchlist.** `watchlist_context_menu` featureset is enabled by default. See [onContextMenu](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.IChartingLibraryWidget#oncontextmenu) for more details.
- **Improved typings within package.json.** The `package.json` bundled with the library has been improved to support newer versions of node, and offer improved typings. See [NPM](https://www.tradingview.com/charting-library-docs/latest/getting_started/NPM) for more details.
- **Price scale now supports numbers with more than 10 decimal points.**
- **Timezone data has been updated.**

**Bug Fixes**

- **Chart type won't change when restoring default options.** The chart type will no longer change when restoring the default options within the chart settings dialog.
- **Last visible bar value in legend for overlay studies.** When `use_last_visible_bar_value_in_legend` featureset is enabled, overlay studies will display the value for the last visible item on the chart. This now matches the behavior for the main series.
- **Fixed zoom behavior for percentage right margin option.** Incorrect zooming behavior has been fixed for zoom buttons appearing on the chart, and the keyboard shortcuts. See `show_percent_option_for_right_margin` [featureset](https://www.tradingview.com/charting-library-docs/latest/customization/Featuresets) for more information.

**Documentation**

- **Add FAQ about unsubscribeBars delay.** Added [a new FAQ](https://www.tradingview.com/charting-library-docs/latest/getting_started/Frequently-Asked-Questions) about [`unsubscribeBars`](https://www.tradingview.com/charting-library-docs/latest/connecting_data/Datafeed-API#unsubscribebars) being called with a delay.

**Other**

- **Added symbol information to datafeed error messages.** Added symbol information to realtime subscription error messages to improve the developer experience.
- **Updated localisation list.** The [list of support localisations](https://www.tradingview.com/charting-library-docs/latest/core_concepts/Localization) has been updated. Additionally, the chart will now fallback to english (with a console warning) if an unsupported locale is specified in the widget constructor options.

## Version 24.002

**New Features**

- **Added support for specifying custom timezones.**
  - Additional custom timezones can now be specified for use within the library. Please see the [Adding Custom Timezones](../ui_elements/timezones#adding-custom-time-zones) section within the Timezones page.
- **Images within timescale marks.**
  - Timescale marks now support the rendering of images within the circular shape by specifying the `imageUrl` property. Please see the [TimescaleMark](../api/interfaces/Charting_Library.TimescaleMark) interface for more details.
- **Support different margin rates for different order types.** [6607](https://github.com/tradingview/charting_library/issues/6607)
  - `marginRate` has been deprecated
  - A [`supportLeverageButton`](../api/interfaces/Broker.BrokerConfigFlags#supportleveragebutton) flag that displays a leverage button has been added to the Broker configuration.
  - The [`supportLeverage`](../api/interfaces/Broker.BrokerConfigFlags#supportleverage) flag enables leverage calculation by getting information from `leverageInfo`.

**Enhancements**

- Add horizontal line at 0 for Momentum study.

**Bug fixes**

- [`setUserEditEnabled`](../api/interfaces/Charting_Library.IStudyApi#setusereditenabled) does not hide 3 dots in Legend. [6765](https://github.com/tradingview/charting_library/issues/6765) | [6165](https://github.com/tradingview/charting_library/issues/6165)

      widget.activeChart().getAllStudies().forEach(({ id }) => {
        console.log(id);
        tvWidget.activeChart().getStudyById(id).setUserEditEnabled(false);
      });

  - setUserEditEnabled(false) should mask all icons except the "eye".
  - setUserEditEnabled(true) should restore all the icons.
- `priceFormatter` could previously only be used for main series. `priceFormatter` now applies to secondary series as well.
- `right_toolbar` featureset didn't have a default `on` value.
- Empty time frames at the bottom toolbar if `data_status: endofday`
- Export data doesn’t include projected data.
  - Projected data can be included by setting [`includeOffsetStudyValues`](../api/interfaces/Charting_Library.ExportDataOptions#includeoffsetstudyvalues) to `true`.
  - `await widget.activeChart().exportData({ includeOffsetStudyValues: true });`
- Highest PineJS.Std function doesn’t work correctly with negative numbers.
- Missing types in bundled definition file. [7445](https://github.com/tradingview/charting_library/issues/7445) | [7446](https://github.com/tradingview/charting_library/issues/7446)
- Exposing `icon` prop in `CreateShapeOptionsBase`. [6723](https://github.com/tradingview/charting_library/issues/6723)
- Wrong extended session background color [7443](https://github.com/tradingview/charting_library/issues/7443)

**Documentation**

- Added [migration guide](../trading_terminal/#how-to-migrate-from-charting-library) from TAC to CTP.
- Added additional documentation for [Drawings](../ui_elements/drawings/).
- Missing overrides in documentation. [7457](https://github.com/tradingview/charting_library/issues/7457)
- Updated documentation for [Marks](../ui_elements/Marks).
- Align ChartMetaInfo & ChartData.

**Other**

- Removed `Australia/ACT` from the list of [timezones](../ui_elements/timezones) within our documentation. Please use either the Sydney timezone or [specify your own custom timezone](../ui_elements/timezones#adding-custom-time-zones).

## Version 24.001

**New Features**

- **Adding originalText as an additional field to UndoRedoState.** Event should mention the name of the action in plain English in addition to also being translated to the corresponding language. [UndoRedoState](@api/interfaces/Charting_Library.UndoRedoState#originalundotext)
- **Add the ability to change X-Axis margin % from Chart Properties.** A new [featureset](@docs/customization/Featuresets) has been added `show_percent_option_for_right_margin` that adds additional percentage option to the right margin section of the chart settings dialog.
- **Display rightmost visible value when in percent mode.** A new [featureset](@docs/customization/Featuresets) has been added `use_last_visible_bar_value_in_legend` to show the most recent “global” bar value. When this feature is enabled the rightmost bar in the visible range is used instead.
- **Ability to change on the fly the Currency and Unit label setting.** [currencyAndUnitVisibility API](@api/interfaces/Charting_Library.IChartingLibraryWidget#currencyandunitvisibility)
- **Add simple SSR support.** Allow the library to be imported within a NodeJS context. This improves support for frameworks such as Remix.
- **Added [`clearUndoHistory`](@api/interfaces/Charting_Library.IChartingLibraryWidget#clearundohistory).**

**Improvements**

- **Name to be used instead of ticker.** Allow a human friendly name to be returned from [`symbol_search_complete`](@api/interfaces/Charting_Library.ChartingLibraryWidgetOptions#symbol_search_complete).

**Bug Fixes**

- **Incomplete indicators when using Heikin-Ashi.** Indicator line should draw to all the visible data points.
- **Compare study doesn’t save and restore ticker name correctly.** The compare study should work for custom ticker names just like it does for ticker names which match our format (with the colon).
- **VPFR: Right point is automatically moving when dragging start point.** When drawing the VPFR, or moving one of the anchor points, it is expected that the right anchor point should not move one bar further to the right.
- **Selecting Apply Defaults option within chart settings doesn’t work.** Some Settings even if not validated are not restored to their original values when Apply Defaults is selected.
- **Decentralised app browser loading error.** Chart fails to load in wallet apps like MetaMask, Trust & Phantom. Enable the `iframe_loading_compatibility_mode` [featureset](@docs/customization/Featuresets) to enable compatibility with these browsers.
- **When disabled, widget bar still present a significant margin.** Even when there aren't any pages or widget in the right toolbar and IF right_toolbar is disabled, contrary to the drawing toolbar that vanishes the widget bar stays there with the pill button to expand it whereas there isn't anything to expand.
- **Can’t enable header_compare feature without header_symbol_search.**
  - Disabling header_symbol_search should only hide the search button
  - Disabling header_compare should only hide the compare button
- **Removed section of PostCSS syntax in bundled css files.**

**Other**

- **New Documentation site.** 🎉
- **Add `shape` to TimeScale.** Shape property is described in [TimescaleMark interface](@api/interfaces/Charting_Library.TimescaleMark#shape).
- **Remove magnet icon near cursor.**

## Version 24

- `preset` Widget-Constructor parameter has been removed. Users can still use some featuresets to mimic the same behavior by disabling the following list:
  - `'left_toolbar', 'header_widget', 'timeframes_toolbar', 'edit_buttons_in_legend', 'context_menus', 'control_bar', 'border_around_the_chart'`
- `chart_style_hilo` featureset is now enabled by default. This adds the High-low option to chart style controls dropdown. This featureset has been available since 1.15 but was previously disabled by default.
- Added typings for custom indicators. Typescript equivalents of our existing examples are available here: [Custom Studies Typescript Examples](../custom_studies/Custom-Studies-Examples).
- [`symbol_search_complete`](../api/interfaces/Charting_Library.ChartingLibraryWidgetOptions#symbol_search_complete) has changed. The function now takes an additional search result object parameter, and returns an additional human-friendly symbol name.

**UI changes**

- With this version you will notice that the top toolbar has been redesigned with the following changes:

  - Button padding & separator size have been reduced
  - Compare button has shifted next to Symbol
  - Drawing icon is now more prominent
  - New fullscreen icon
  - Save button style better highlights when there's a change
  - Top toolbar now extends to left & right edges
  - UI font changes to a default system one
  - Undo/redo buttons are now relocated next to the save button

**Trading Platform**

- Default formatter `textNoWrap` has been removed.
- `columnId` field of [SortingParameters](../api/interfaces/Broker.SortingParameters) has been renamed to `property`.
- Required `id` field has been added to [column description](../api/interfaces/Broker.AccountManagerColumnBase#id).
- Type of `formatter` field in [column description](../api/interfaces/Broker.AccountManagerColumnBase#formatter) has been changed to [StandardFormatterName | FormatterName](../api/enums/Charting_Library.StandardFormatterName).
- `property` field has been removed from `column description`. Use [dataFields](../api/interfaces/Broker.AccountManagerColumnBase#datafields) field instead.
- Type of `formatter` field in [SummaryField](../api/interfaces/Broker.AccountManagerSummaryField) has been changed to [StandardFormatterName](../api/enums/Charting_Library.StandardFormatterName).
