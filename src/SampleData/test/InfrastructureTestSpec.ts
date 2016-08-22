/// <reference path="../sdk/tsd.d.ts" />
/// <reference path="../scripts/infrastructure.ts" />

export module InfrastructureTestSpec {
    describe('Infrastructure', () => {
        it('CleanPathTrailingSlash-WithNoSlash', done => {
            var path = Utilities.CleanTrailingSlash("\\hello");
            expect(path).toBe("\\hello");
            done();
        });
        it('CleanPathTrailingSlash-WithSlash', done => {
            var path = Utilities.CleanTrailingSlash("\\hello\\");
            expect(path).toBe("\\hello");
            done();
        });

        it('ResolveDateMacro-@Today', done => {
            var now = new Date().toJSON();
            var params = [{ Field: "@Today", Value: now }, { Field: "@Me", Value: "Me" }];

            var result = Utilities.ResolveDateMacro("@Today", params);

            expect(result).toBe(now);
            done();
        });

        it('ResolveDateMacro-NoMacro', done => {
            var now = new Date().toJSON();
            var params = [{ Field: "@Today", Value: now }, { Field: "@Me", Value: "Me" }];

            var result = Utilities.ResolveDateMacro("blue", params);

            expect(result).toBe("blue");
            done();
        });

        it('ResolveDateMacro-plus1', done => {
            var nowdate = new Date();

            var tomorrow = new Date(Date.parse(nowdate.toJSON()));
            tomorrow.setDate(nowdate.getDate() + 1);

            var params = [{ Field: "@Today", Value: nowdate.toJSON() }, { Field: "@Me", Value: "Me" }];
            var result = Utilities.ResolveDateMacro("@Today+1", params);


            expect(result).toBe(tomorrow.toJSON());
            done();
        });

        it('ResolveDateMacro-min1', done => {
            var nowdate = new Date();

            var tomorrow = new Date(Date.parse(nowdate.toJSON()));
            tomorrow.setDate(nowdate.getDate() - 1);

            var params = [{ Field: "@Today", Value: nowdate.toJSON() }, { Field: "@Me", Value: "Me" }];
            var result = Utilities.ResolveDateMacro("@Today-1", params);

            expect(result).toBe(tomorrow.toJSON());
            done();
        });

        it('ResolveDateMacro-endOfMonth', done => {
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
}