//---------------------------------------------------------------------
// <copyright file="TelemetryClient.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>
// </summary>
//---------------------------------------------------------------------
/// <reference path="../sdk/ai.0.22.9-build00167.d.ts" />
var TelemetryClient = (function () {
    function TelemetryClient() {
    }
    TelemetryClient.getClient = function () {
        if (!this.telemetryClient) {
            this.telemetryClient = new TelemetryClient();
            this.telemetryClient.Init();
        }
        return this.telemetryClient;
    };
    TelemetryClient.prototype.Init = function () {
        var snippet = {
            config: {
                instrumentationKey: TelemetryClient.DevLabs_SampleData
            }
        };
        try {
            var init = new Microsoft.ApplicationInsights.Initialization(snippet);
            this.appInsightsClient = init.loadAppInsights();
            var webContext = VSS.getWebContext();
            this.appInsightsClient.setAuthenticatedUserContext(webContext.user.id, webContext.collection.id);
            window.onerror = function (eventOrMessage, source, fileno) {
                TelemetryClient.getClient().trackException(eventOrMessage, source, fileno);
            };
        }
        catch (ex) {
        }
    };
    TelemetryClient.prototype.trackPageView = function (name, url, properties, measurements, duration) {
        try {
            this.appInsightsClient.trackPageView(TelemetryClient.ExtensionContext + "." + name, url, properties, measurements, duration);
            this.appInsightsClient.flush();
        }
        catch (ex) {
        }
    };
    TelemetryClient.prototype.trackEvent = function (name, properties, measurements) {
        try {
            this.appInsightsClient.trackEvent(TelemetryClient.ExtensionContext + "." + name, properties, measurements);
            this.appInsightsClient.flush();
        }
        catch (ex) {
        }
    };
    TelemetryClient.prototype.trackException = function (exceptionMessage, handledAt, properties, measurements) {
        try {
            console.error(exceptionMessage);
            var error = {
                name: TelemetryClient.ExtensionContext + "." + handledAt,
                message: exceptionMessage
            };
            this.appInsightsClient.trackException(error, handledAt, properties, measurements);
            this.appInsightsClient.flush();
        }
        catch (ex) {
        }
    };
    TelemetryClient.prototype.trackMetric = function (name, average, sampleCount, min, max, properties) {
        try {
            this.appInsightsClient.trackMetric(TelemetryClient.ExtensionContext + "." + name, average, sampleCount, min, max, properties);
            this.appInsightsClient.flush();
        }
        catch (ex) {
        }
    };
    TelemetryClient.TestingKey = "32a074c8-36a4-442b-9432-5704ec064444";
    TelemetryClient.DevLabs_SampleData = "53bd8fe1-1dd8-4b88-847e-20e917d09712";
    TelemetryClient.ExtensionContext = "SampleData";
    return TelemetryClient;
})();
//# sourceMappingURL=telemetryclient.js.map