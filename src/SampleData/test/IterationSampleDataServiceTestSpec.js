/// <reference path="../scripts/sampledatacontract.ts" />
/// <reference path="../sdk/tsd.d.ts" />
//import IterationStrategy = require("../scripts/IterationSampleDataService");
//export module IterationSampleDataServiceTestSpec {
//    describe("IterationSampleDataServiceTestSpec", () => {
//        it("BuildPromises With One Root", done => {
//            var strategy = new IterationStrategy.IterationSampleDataService();
//            var s1start = new Date(2016, 1, 1);
//            var s1finish = new Date(2016, 1, 14)
//            var nodes: IterationStrategy.IterationTemplate[] =
//                [{
//                    Path: "Release 1",
//                    Name: "Sprint 1",
//                    startDate: s1start,
//                    finishDate: s1finish
//                },
//                    {
//                        Path: "Release 1",
//                        Name : "Sprint 2",
//                        startDate: new Date(2016, 1, 15),
//                        finishDate: new Date(2016, 1, 28)
//                    }];
//            var list: IterationStrategy.IterationsTemplate = {
//                templateIterations: nodes
//            };
//            var result = strategy.BuildPromises(list);
//            expect(result.length).toBe(2);
//            done();
//       });
//    });
//} 
//# sourceMappingURL=IterationSampleDataServiceTestSpec.js.map