//---------------------------------------------------------------------
// <copyright file="telemetryclient.ts">
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

class TelemetryClient {

    private static TestingKey = "32a074c8-36a4-442b-9432-5704ec064444";
    private static DevLabs_SampleData = "53bd8fe1-1dd8-4b88-847e-20e917d09712";


    private static telemetryClient: TelemetryClient;

    private static ExtensionContext : string = "SampleData"; 

    public static getClient(): TelemetryClient {

        if (!this.telemetryClient) {
            this.telemetryClient = new TelemetryClient();
            this.telemetryClient.Init();
        }

        return this.telemetryClient;

    }

    private appInsightsClient: Microsoft.ApplicationInsights.AppInsights;

    private Init() {
        var snippet: any = {
            config: {
                instrumentationKey:  TelemetryClient.DevLabs_SampleData
            }
        };
        try {
            var init = new Microsoft.ApplicationInsights.Initialization(snippet);
            this.appInsightsClient = init.loadAppInsights();

            var webContext = VSS.getWebContext();
            this.appInsightsClient.setAuthenticatedUserContext(webContext.user.id, webContext.collection.id);

            window.onerror = function (eventOrMessage: any, source: string, fileno: number) {
                TelemetryClient.getClient().trackException(eventOrMessage, source, fileno);
            };
        }
        catch(ex){
        }
    }

    public trackPageView(name?: string, url?: string, properties?: Object, measurements?: Object, duration?: number) {
        try {
            this.appInsightsClient.trackPageView(TelemetryClient.ExtensionContext + "." + name, url, properties, measurements, duration);
            this.appInsightsClient.flush();
        }
        catch (ex) {
        }
    }

    public trackEvent(name: string, properties?: Object, measurements?: Object) {
        try {
            this.appInsightsClient.trackEvent(TelemetryClient.ExtensionContext + "." + name, properties, measurements);
            this.appInsightsClient.flush();
        }
        catch(ex) {
        }
    }

    public trackException(exceptionMessage: string, handledAt?: string, properties?: Object, measurements?: Object) {
        try {
            console.error(exceptionMessage);

            var error: Error = {
                name: TelemetryClient.ExtensionContext + "." + handledAt,
                message: exceptionMessage
            };

            this.appInsightsClient.trackException(error, handledAt, properties, measurements);
            this.appInsightsClient.flush();
        }
        catch (ex) {
        }
    }

    public trackMetric(name: string, average: number, sampleCount?: number, min?: number, max?: number, properties?: Object) {
        try {
            this.appInsightsClient.trackMetric(TelemetryClient.ExtensionContext + "." + name, average, sampleCount, min, max, properties);
            this.appInsightsClient.flush();
        }
        catch (ex) {
        }
    }

}