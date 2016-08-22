/// <reference path="../sdk/tsd.d.ts" />
/// <reference path="../scripts/infrastructure.ts" />
define(["require", "exports"], function (require, exports) {
    var InfrastructureTestSpec;
    (function (InfrastructureTestSpec) {
        describe('Infrastructure', function () {
            it('CleanPathTrailingSlash-WithNoSlash', function (done) {
                var path = Utilities.CleanTrailingSlash("\\hello");
                expect(path).toBe("\\hello");
                done();
            });
            it('CleanPathTrailingSlash-WithSlash', function (done) {
                var path = Utilities.CleanTrailingSlash("\\hello\\");
                expect(path).toBe("\\hello");
                done();
            });
            it('ResolveDateMacro-@Today', function (done) {
                var now = new Date().toJSON();
                var params = [{ Field: "@Today", Value: now }, { Field: "@Me", Value: "Me" }];
                var result = Utilities.ResolveDateMacro("@Today", params);
                expect(result).toBe(now);
                done();
            });
            it('ResolveDateMacro-NoMacro', function (done) {
                var now = new Date().toJSON();
                var params = [{ Field: "@Today", Value: now }, { Field: "@Me", Value: "Me" }];
                var result = Utilities.ResolveDateMacro("blue", params);
                expect(result).toBe("blue");
                done();
            });
            it('ResolveDateMacro-plus1', function (done) {
                var nowdate = new Date();
                var tomorrow = new Date(Date.parse(nowdate.toJSON()));
                tomorrow.setDate(nowdate.getDate() + 1);
                var params = [{ Field: "@Today", Value: nowdate.toJSON() }, { Field: "@Me", Value: "Me" }];
                var result = Utilities.ResolveDateMacro("@Today+1", params);
                expect(result).toBe(tomorrow.toJSON());
                done();
            });
            it('ResolveDateMacro-min1', function (done) {
                var nowdate = new Date();
                var tomorrow = new Date(Date.parse(nowdate.toJSON()));
                tomorrow.setDate(nowdate.getDate() - 1);
                var params = [{ Field: "@Today", Value: nowdate.toJSON() }, { Field: "@Me", Value: "Me" }];
                var result = Utilities.ResolveDateMacro("@Today-1", params);
                expect(result).toBe(tomorrow.toJSON());
                done();
            });
            it('ResolveDateMacro-endOfMonth', function (done) {
                var nowdate = new Date(2016, 1, 31);
                var tomorrow = new Date(Date.parse(nowdate.toJSON()));
                tomorrow.setDate(nowdate.getDate() - 1);
                var params = [{ Field: "@Today", Value: nowdate.toJSON() }, { Field: "@Me", Value: "Me" }];
                var result = Utilities.ResolveDateMacro("@Today-1", params);
                var resultingDate = new Date(Date.parse(result));
                expect(result).toBe(tomorrow.toJSON());
                expect(resultingDate.getDate()).toBe(1);
                expect(resultingDate.getMonth()).toBe(2);
                done();
            });
        });
    })(InfrastructureTestSpec = exports.InfrastructureTestSpec || (exports.InfrastructureTestSpec = {}));
});
//# sourceMappingURL=InfrastructureTestSpec.js.map