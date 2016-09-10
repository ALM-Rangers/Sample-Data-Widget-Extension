///// <reference path="../sdk/tsd.d.ts" />
define(["require", "exports", "../scripts/templateservices"], function (require, exports, TemplateService) {
    "use strict";
    var TemplateServiceTestSpec;
    (function (TemplateServiceTestSpec) {
        describe("TemplateServiceTestSpec", function () {
            it("getDefaultTemplates", function (done) {
                var templateService = new TemplateService.TemplateService();
                spyOn(VSS, "getExtensionContext").and.returnValue({
                    baseUri: "./",
                    publisherId: "test",
                    extensionId: "test-extension",
                    version: "1"
                });
                templateService.getDefaultTemplates().then(function (data) {
                    expect(VSS.getExtensionContext).toHaveBeenCalled();
                    expect(data.length).toBe(1);
                    done();
                });
            });
        });
    })(TemplateServiceTestSpec = exports.TemplateServiceTestSpec || (exports.TemplateServiceTestSpec = {}));
});
//# sourceMappingURL=TemplateServiceTestSpec.js.map