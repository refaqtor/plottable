///<reference path="../testReference.ts" />

var assert = chai.assert;

describe("TimeScale tests", () => {
  it("can be padded", () => {
    var scale = new Plottable.Scales.Time();
    scale.padProportion(0);
    var unpaddedDomain = scale.domain();
    scale.addExtentsProvider((scale: Plottable.Scales.Time) => [unpaddedDomain]);
    scale.padProportion(0.1);
    assert.operator(scale.domain()[0].getTime(), "<", unpaddedDomain[0].getTime(), "left side of domain was padded");
    assert.operator(scale.domain()[1].getTime(), ">", unpaddedDomain[1].getTime(), "right side of domain was padded");
  });

  it("respects padding exceptions", () => {
    var scale = new Plottable.Scales.Time();
    var minValue = new Date(2000, 5, 4);
    var maxValue = new Date(2000, 5, 6);
    scale.addExtentsProvider((scale: Plottable.Scales.Time) => [[minValue, maxValue]]);
    scale.padProportion(0.1);
    assert.operator(scale.domain()[0].getTime(), "<", minValue.getTime(), "left side of domain is normally padded");
    assert.operator(scale.domain()[1].getTime(), ">", maxValue.getTime(), "right side of domain is normally padded");
    var exceptionKey = "unitTests";
    scale.addPaddingException(exceptionKey, minValue);
    assert.strictEqual(scale.domain()[0].getTime(), minValue.getTime(), "left side of domain isn't padded if it matches the exception");
    scale.addPaddingException(exceptionKey, maxValue);
    assert.strictEqual(scale.domain()[1].getTime(), maxValue.getTime(), "right side of domain isn't padded if it matches the exception");
  });

  it("autoDomain() expands single value to [value - 1 day, value + 1 day]", () => {
    var scale = new Plottable.Scales.Time();
    scale.padProportion(0);
    var singleValue = new Date(2000, 5, 5);
    var dayBefore = new Date(2000, 5, 4);
    var dayAfter = new Date(2000, 5, 6);
    scale.addExtentsProvider((scale: Plottable.Scales.Time) => [[singleValue, singleValue]]);
    scale.autoDomain();
    var domain = scale.domain();
    assert.strictEqual(domain[0].getTime(), dayBefore.getTime(), "left side of domain was expaded by one day");
    assert.strictEqual(domain[1].getTime(), dayAfter.getTime(), "right side of domain was expaded by one day");
  });

  it("can't set reversed domain", () => {
    var scale = new Plottable.Scales.Time();
    assert.throws(() => scale.domain([new Date("1985-10-26"), new Date("1955-11-05")]), "chronological");
  });

  it("tickInterval produces correct number of ticks", () => {
    var scale = new Plottable.Scales.Time();
    // 100 year span
    scale.domain([new Date(2000, 0, 1, 0, 0, 0, 0), new Date(2100, 0, 1, 0, 0, 0, 0)]);
    var ticks = scale.tickInterval(Plottable.TimeInterval.year);
    assert.strictEqual(ticks.length, 101, "generated correct number of ticks");
    // 1 year span
    scale.domain([new Date(2000, 0, 1, 0, 0, 0, 0), new Date(2000, 11, 31, 0, 0, 0, 0)]);
    ticks = scale.tickInterval(Plottable.TimeInterval.month);
    assert.strictEqual(ticks.length, 12, "generated correct number of ticks");
    ticks = scale.tickInterval(Plottable.TimeInterval.month, 3);
    assert.strictEqual(ticks.length, 4, "generated correct number of ticks");
    // 1 month span
    scale.domain([new Date(2000, 0, 1, 0, 0, 0, 0), new Date(2000, 1, 1, 0, 0, 0, 0)]);
    ticks = scale.tickInterval(Plottable.TimeInterval.day);
    assert.strictEqual(ticks.length, 32, "generated correct number of ticks");
    // 1 day span
    scale.domain([new Date(2000, 0, 1, 0, 0, 0, 0), new Date(2000, 0, 1, 23, 0, 0, 0)]);
    ticks = scale.tickInterval(Plottable.TimeInterval.hour);
    assert.strictEqual(ticks.length, 24, "generated correct number of ticks");
    // 1 hour span
    scale.domain([new Date(2000, 0, 1, 0, 0, 0, 0), new Date(2000, 0, 1, 1, 0, 0, 0)]);
    ticks = scale.tickInterval(Plottable.TimeInterval.minute);
    assert.strictEqual(ticks.length, 61, "generated correct number of ticks");
    ticks = scale.tickInterval(Plottable.TimeInterval.minute, 10);
    assert.strictEqual(ticks.length, 7, "generated correct number of ticks");
    // 1 minute span
    scale.domain([new Date(2000, 0, 1, 0, 0, 0, 0), new Date(2000, 0, 1, 0, 1, 0, 0)]);
    ticks = scale.tickInterval(Plottable.TimeInterval.second);
    assert.strictEqual(ticks.length, 61, "generated correct number of ticks");
  });
});
