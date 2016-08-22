/// <reference path="../scripts/sampledatacontract.ts" />
/// <reference path="../sdk/tsd.d.ts" />
define(["require", "exports", "../scripts/IterationSampleDataService"], function (require, exports, IterationStrategy) {
    var IterationStrategyTestSpec;
    (function (IterationStrategyTestSpec) {
        describe("IterationStrategyTestSpec", function () {
            it("BuildPromises With One Root", function (done) {
                var strategy = new IterationStrategy.IterationSampleDataService();
                var s1start = new Date(2016, 1, 1);
                var s1finish = new Date(2016, 1, 14);
                var nodes = [{
                        Path: "Release 1",
                        Name: "Sprint 1",
                        startDate: s1start,
                        finishDate: s1finish
                    },
                    {
                        Path: "Release 1",
                        Name: "Sprint 2",
                        startDate: new Date(2016, 1, 15),
                        finishDate: new Date(2016, 1, 28)
                    }];
                var list = {
                    Iterations: nodes
                };
                var result = strategy.BuildPromises(list);
                expect(result.length).toBe(2);
                done();
            });
        });
    })(IterationStrategyTestSpec = exports.IterationStrategyTestSpec || (exports.IterationStrategyTestSpec = {}));
});
//# sourceMappingURL=IterationStrategyTestSpec.js.map