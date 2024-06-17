<!DOCTYPE HTML>
<html>
	<head>

		<title>TradingView Advanced Charts Themes Demo</title>

		<!-- Fix for iOS Safari zooming bug -->
		<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,minimum-scale=1.0">

		<script type="text/javascript" src="charting_library/charting_library.standalone.js"></script>
		<script type="text/javascript" src="datafeeds/udf/dist/bundle.js"></script>

		<script type="text/javascript">

			function getParameterByName(name) {
				name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
				var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
					results = regex.exec(location.search);
				return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
			}

			function initOnReady() {
				var datafeedUrl = "https://demo-feed-data.tradingview.com";
				var customDataUrl = getParameterByName('dataUrl');
				if (customDataUrl !== "") {
					datafeedUrl = customDataUrl.startsWith('https://') ? customDataUrl : `https://${customDataUrl}`;
				}

				var widget = window.tvWidget = new TradingView.widget({
					// debug: true, // uncomment this line to see Library errors and warnings in the console
					fullscreen: true,
					symbol: 'AAPL',
					interval: '1D',
					container: "tv_chart_container",

					//	BEWARE: no trailing slash is expected in feed URL
					datafeed: new Datafeeds.UDFCompatibleDatafeed(datafeedUrl, undefined, {
						maxResponseLength: 1000,
						expectedOrder: 'latestFirst',
					}),
					library_path: "charting_library/",
					locale: getParameterByName('lang') || "en",

					disabled_features: ["use_localstorage_for_settings"],
					enabled_features: ["study_templates"],
					charts_storage_url: 'https://saveload.tradingview.com',
					charts_storage_api_version: "1.1",
					client_id: 'tradingview.com',
					user_id: 'public_user_id',
					theme: getParameterByName('theme'),
					// custom_css_url should be related to library_path
					custom_css_url: '../themed.css',
				});
			};

			window.addEventListener('DOMContentLoaded', initOnReady, false);
		</script>

	</head>

	<body style="margin:0px;">
		<div id="tv_chart_container"></div>
	</body>

</html>
