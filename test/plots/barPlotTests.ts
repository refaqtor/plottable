///<reference path="../testReference.ts" />

describe("Plots", () => {
  describe("Bar Plot", () => {
    describe ("orientations", () => {
      it("rejects invalid orientations", () => {
        assert.throws(() => new Plottable.Plots.Bar("diagonal"), Error);
      });

      it("defaults to vertical", () => {
        let defaultPlot = new Plottable.Plots.Bar<number, number>();
        assert.strictEqual(defaultPlot.orientation(), "vertical", "default Plots.Bar() are vertical");
      });

      it("sets orientation on construction", () => {
        let verticalPlot = new Plottable.Plots.Bar<number, number>("vertical");
        assert.strictEqual(verticalPlot.orientation(), "vertical", "vertical Plots.Bar()");

        let horizontalPlot = new Plottable.Plots.Bar<number, number>("horizontal");
        assert.strictEqual(horizontalPlot.orientation(), "horizontal", "horizontal Plots.Bar()");
      });
    });

    const orientations = [Plottable.Plots.Bar.ORIENTATION_VERTICAL, Plottable.Plots.Bar.ORIENTATION_HORIZONTAL];
    orientations.forEach((orientation) => {
      const isVertical = orientation === Plottable.Plots.Bar.ORIENTATION_VERTICAL;
      const basePositionAttr = isVertical ? "x" : "y";
      const baseSizeAttr = isVertical ? "width" : "height";
      const valuePositionAttr = isVertical ? "y" : "x";
      const valueSizeAttr = isVertical ? "height" : "width";

      describe(`rendering when ${orientation}`, () => {
        const data = [
          { base: "A", value: 1 },
          { base: "B", value: 0 },
          { base: "C", value: -1 }
        ];

        let svg: d3.Selection<void>;
        let barPlot: Plottable.Plots.Bar<string | number, number | string>;
        let baseScale: Plottable.Scales.Category;
        let valueScale: Plottable.Scales.Linear;
        let dataset: Plottable.Dataset;

        beforeEach(() => {
          svg = TestMethods.generateSVG();
          barPlot = new Plottable.Plots.Bar<string | number, number | string>(orientation);
          baseScale = new Plottable.Scales.Category();
          valueScale = new Plottable.Scales.Linear();
          if (orientation === Plottable.Plots.Bar.ORIENTATION_VERTICAL) {
            barPlot.x((d: any) => d.base, baseScale);
            barPlot.y((d: any) => d.value, valueScale);
          } else {
            barPlot.y((d: any) => d.base, baseScale);
            barPlot.x((d: any) => d.value, valueScale);
          }
          dataset = new Plottable.Dataset(data);
        });

        function assertCorrectRendering() {
          const baseline = barPlot.content().select(".baseline");
          const scaledBaselineValue = valueScale.scale(<number> barPlot.baselineValue());
          assert.strictEqual(TestMethods.numAttr(baseline, valuePositionAttr + "1"), scaledBaselineValue,
            `baseline ${valuePositionAttr + "1"} is correct`);
          assert.strictEqual(TestMethods.numAttr(baseline, valuePositionAttr + "2"), scaledBaselineValue,
            `baseline ${valuePositionAttr + "2"} is correct`);
          assert.strictEqual(TestMethods.numAttr(baseline, basePositionAttr + "1"), 0,
            `baseline ${basePositionAttr + "1"} is correct`);
          assert.strictEqual(TestMethods.numAttr(baseline, basePositionAttr + "2"), TestMethods.numAttr(svg, baseSizeAttr),
            `baseline ${basePositionAttr + "2"} is correct`);

          const bars = barPlot.content().selectAll("rect");
          assert.strictEqual(bars.size(), data.length, "One bar was created per data point");
          bars.each(function(datum, index) {
            const bar = d3.select(this);
            const baseSize = TestMethods.numAttr(bar, baseSizeAttr);
            assert.closeTo(baseSize, baseScale.rangeBand(), window.Pixel_CloseTo_Requirement, `bar ${baseSizeAttr} is correct (index ${index})`);

            const valueSize = TestMethods.numAttr(bar, valueSizeAttr);
            assert.closeTo(valueSize, Math.abs(valueScale.scale(datum.value) - scaledBaselineValue),
              window.Pixel_CloseTo_Requirement, `bar ${valueSizeAttr} is correct (index ${index})`);

            const basePosition = TestMethods.numAttr(bar, basePositionAttr);
            assert.closeTo(basePosition, baseScale.scale(datum.base) - 0.5 * baseSize, window.Pixel_CloseTo_Requirement,
              `bar ${basePositionAttr} is correct (index ${index})`);

            const valuePosition = TestMethods.numAttr(bar, valuePositionAttr);
            const isShifted = isVertical ? (datum.value > barPlot.baselineValue()) : (datum.value < barPlot.baselineValue());
            const expectedValuePosition = (isShifted) ? scaledBaselineValue - valueSize : scaledBaselineValue;
            assert.closeTo(valuePosition, expectedValuePosition, window.Pixel_CloseTo_Requirement,
              `bar ${valuePositionAttr} is correct (index ${index})`);
          });
        }

        it("renders with no data", () => {
          assert.doesNotThrow(() => barPlot.renderTo(svg), Error);
          assert.strictEqual(barPlot.width(), TestMethods.numAttr(svg, "width"), "was allocated width");
          assert.strictEqual(barPlot.height(), TestMethods.numAttr(svg, "height"), "was allocated height");
        });

        it("draws bars and baseline in correct positions", () => {
          barPlot.addDataset(dataset);
          barPlot.renderTo(svg);

          assertCorrectRendering();
        });

        it("rerenders correctly when the baseline value is changed", () => {
          barPlot.addDataset(dataset);
          barPlot.renderTo(svg);

          barPlot.baselineValue(1);
          assertCorrectRendering();
        });

        it("can autorange value scale based on visible points on base scale", () => {
          const firstTwoBaseValues = [data[0].base, data[1].base ];
          valueScale.padProportion(0);
          baseScale.domain(firstTwoBaseValues);
          barPlot.addDataset(dataset);
          barPlot.autorangeMode(valuePositionAttr);
          barPlot.renderTo(svg);

          const valueScaleDomain = valueScale.domain();
          const expectedValueDomainMin = Math.min(data[0].value, data[1].value);
          const expectedValueDomainMax = Math.max(data[0].value, data[1].value);
          assert.strictEqual(valueScaleDomain[0], expectedValueDomainMin, "lower bound of domain set based on visible points");
          assert.strictEqual(valueScaleDomain[1], expectedValueDomainMax, "upper bound of domain set based on visible points");
        });

        it("doesn't show values from outside the base scale's domain", () => {
          baseScale.domain(["-A"]);
          barPlot.addDataset(dataset);
          barPlot.renderTo(svg);

          assert.strictEqual(barPlot.content().selectAll("rect").size(), 0, "draws no bars when the domain contains no data points");
        });

        afterEach(function() {
          if (this.currentTest.state === "passed") {
            barPlot.destroy();
            svg.remove();
          }
        });
      });

      describe(`auto bar width calculation when ${orientation}`, () => {
        const scaleTypes = ["Linear", "ModifiedLog", "Time"];
        scaleTypes.forEach((scaleType) => {
          describe(`using a ${scaleType} base Scale`, () => {
            let svg: d3.Selection<void>;
            let barPlot: Plottable.Plots.Bar<number | Date, number | Date>;
            let baseScale: Plottable.QuantitativeScale<number | Date>;
            let valueScale: Plottable.Scales.Linear;
            let dataset: Plottable.Dataset;

            beforeEach(() => {
              svg = TestMethods.generateSVG();
              barPlot = new Plottable.Plots.Bar<number | Date, number | Date>(orientation);

              switch (scaleType) {
                case "Linear":
                  baseScale = new Plottable.Scales.Linear();
                  break;
                case "ModifiedLog":
                  baseScale = new Plottable.Scales.ModifiedLog();
                  break;
                case "Time":
                  baseScale = new Plottable.Scales.Time();
                  break;
                default:
                  throw new Error("unexpected base Scale type");
              }
              valueScale = new Plottable.Scales.Linear();

              const baseAccessor = (scaleType === "Time") ? (d: any) => new Date(d.base) : (d: any) => d.base;
              const valueAccessor = (d: any) => d.value;
              if (orientation === Plottable.Plots.Bar.ORIENTATION_VERTICAL) {
                barPlot.x(baseAccessor, baseScale);
                barPlot.y(valueAccessor, valueScale);
              } else {
                barPlot.y(baseAccessor, baseScale);
                barPlot.x(valueAccessor, valueScale);
              }
              dataset = new Plottable.Dataset();
              barPlot.addDataset(dataset);
              barPlot.renderTo(svg);
            });

            it("computes a sensible width", () => {
              const data = [
                { base: 1, value: 5 },
                { base: 10, value: 2 },
                { base: 100, value: 4 }
              ];
              dataset.data(data);

              const closestSeparation = Math.abs(baseScale.scale(data[1].base) - baseScale.scale(data[0].base));
              const bars = barPlot.content().selectAll("rect");
              assert.strictEqual(bars.size(), data.length, "one bar was drawn per datum");
              bars.each(function() {
                const bar = d3.select(this);
                const barSize = TestMethods.numAttr(bar, baseSizeAttr);
                assert.operator(barSize, "<=", closestSeparation, "bar width is less than the closest distance between values");
                assert.operator(barSize, ">=", 0.5 * closestSeparation, "bar width is greater than half the closest distance between values");
              });
            });

            it("accounts for the bar width when autoDomaining the base scale", () => {
              const data = [
                { base: 1, value: 5 },
                { base: 10, value: 2 },
                { base: 100, value: 4 }
              ];
              dataset.data(data);

              const bars = barPlot.content().selectAll("rect");
              assert.strictEqual(bars.size(), data.length, "one bar was drawn per datum");
              const svgSize = TestMethods.numAttr(svg, baseSizeAttr);
              bars.each(function() {
                const bar = d3.select(this);
                const barPosition = TestMethods.numAttr(bar, basePositionAttr);
                const barSize = TestMethods.numAttr(bar, baseSizeAttr);
                assert.operator(barPosition, ">=", 0, `bar is within visible area (${basePositionAttr})`);
                assert.operator(barPosition, "<=", svgSize, `bar is within visible area (${basePositionAttr})`);
                assert.operator(barPosition + barSize, ">=", 0, `bar is within visible area (${baseSizeAttr})`);
                assert.operator(barPosition + barSize, "<=", svgSize, `bar is within visible area (${baseSizeAttr})`);
              });
            });

            it("does not crash when given bad data", () => {
              const badData: any = [
                {},
                { base: null, value: null }
              ]
              assert.doesNotThrow(() => dataset.data(badData), Error);
            });

            it("computes a sensible width when given only one datum", () => {
              const singleDatumData = [
                { base: 1, value: 5 }
              ];
              dataset.data(singleDatumData);

              const bar = barPlot.content().select("rect");
              const barSize = TestMethods.numAttr(bar, baseSizeAttr);
              const svgSize = TestMethods.numAttr(svg, baseSizeAttr);
              assert.operator(barSize, ">=", svgSize / 4, "bar is larger than 1/4 of the available space");
              assert.operator(barSize, "<=", svgSize / 2, "bar is smaller than half the available space");
            });

            it("computes a sensible width when given repeated base value", () => {
              const repeatedBaseData = [
                { base: 1, value: 5 },
                { base: 1, value: -5 }
              ];
              dataset.data(repeatedBaseData);

              const bars = barPlot.content().selectAll("rect");
              assert.strictEqual(bars.size(), repeatedBaseData.length, "one bar was drawn per datum");
              const svgSize = TestMethods.numAttr(svg, baseSizeAttr);
              bars.each(function() {
                const bar = d3.select(this);
                const barSize = TestMethods.numAttr(bar, baseSizeAttr)
                assert.operator(barSize, ">=", svgSize / 4, "bar is larger than 1/4 of the available space");
                assert.operator(barSize, "<=", svgSize / 2, "bar is smaller than half the available space");
              });
            });

            it("computes a sensible width when given unsorted data", () => {
              const unsortedData = [
                { base: 10, value: 2 },
                { base: 1, value: 5 },
                { base: 100, value: 4 }
              ];
              dataset.data(unsortedData);

              const closestSeparation = Math.abs(baseScale.scale(unsortedData[1].base) - baseScale.scale(unsortedData[0].base));
              const bars = barPlot.content().selectAll("rect");
              assert.strictEqual(bars.size(), unsortedData.length, "one bar was drawn per datum");
              bars.each(function() {
                const bar = d3.select(this);
                const barSize = TestMethods.numAttr(bar, baseSizeAttr)
                assert.operator(barSize, "<=", closestSeparation, "bar width is less than the closest distance between values");
                assert.operator(barSize, ">=", 0.5 * closestSeparation, "bar width is greater than half the closest distance between values");
              });
            });

            afterEach(function() {
              if (this.currentTest.state === "passed") {
                barPlot.destroy();
                svg.remove();
              }
            });
          });
        });
      });

      describe(`labels when ${orientation}`, () => {
        const data = [
          { base: -4, value: -4 },
          { base: -2, value: -0.1},
          { base: 0, value: 0 },
          { base: 2, value: 0.1 },
          { base: 4, value: 4 }
        ];
        const DEFAULT_DOMAIN = [-5, 5];

        let svg: d3.Selection<void>;
        let baseScale: Plottable.Scales.Linear;
        let valueScale: Plottable.Scales.Linear;
        let barPlot: Plottable.Plots.Bar<number, number>;
        let dataset: Plottable.Dataset;

        beforeEach(() => {
          svg = TestMethods.generateSVG();
          barPlot = new Plottable.Plots.Bar<number, number>(orientation);
          baseScale = new Plottable.Scales.Linear();
          baseScale.domain(DEFAULT_DOMAIN);
          valueScale = new Plottable.Scales.Linear();
          valueScale.domain(DEFAULT_DOMAIN);
          if (orientation === Plottable.Plots.Bar.ORIENTATION_VERTICAL) {
            barPlot.x((d: any) => d.base, baseScale);
            barPlot.y((d: any) => d.value, valueScale);
          } else {
            barPlot.y((d: any) => d.base, baseScale);
            barPlot.x((d: any) => d.value, valueScale);
          }
          dataset = new Plottable.Dataset(data);
          barPlot.addDataset(dataset);
          barPlot.renderTo(svg);
        });

        function getCenterOfText(textNode: SVGElement) {
          const plotBoundingClientRect = (<SVGElement> barPlot.background().node()).getBoundingClientRect();
          const labelBoundingClientRect = textNode.getBoundingClientRect();

          return {
            x: (labelBoundingClientRect.left + labelBoundingClientRect.right) / 2 - plotBoundingClientRect.left,
            y: (labelBoundingClientRect.top + labelBoundingClientRect.bottom) / 2 - plotBoundingClientRect.top
          };
        };

        it("does not show labels by default", () => {
          const texts = barPlot.content().selectAll("text");
          assert.strictEqual(texts.size(), 0, "by default, no texts are drawn");
        });

        it("draws one label per datum", () => {
          barPlot.labelsEnabled(true);
          barPlot.labelsEnabled(true);
          const texts = barPlot.content().selectAll("text");
          assert.strictEqual(texts.size(), data.length, "one label drawn per datum");
          texts.each(function(d, i) {
            assert.strictEqual(d3.select(this).text(), data[i].value.toString(), `by default, label text is the bar's value (index ${i})`);
          });
        });

        it("hides the labels if bars are too thin to show them", () => {
          svg.attr(baseSizeAttr, TestMethods.numAttr(svg, baseSizeAttr) / 10);
          barPlot.redraw();
          barPlot.labelsEnabled(true);

          const texts = barPlot.content().selectAll("text");
          assert.strictEqual(texts.size(), 0, "no labels drawn");
        });

        it("can apply a formatter to the labels", () => {
          barPlot.labelsEnabled(true);
          const formatter = (n: number) => `${n}%`;
          barPlot.labelFormatter(formatter);

          const texts = barPlot.content().selectAll("text");
          assert.strictEqual(texts.size(), data.length, "one label drawn per datum");
          const expectedTexts = data.map((d) => formatter(d.value));
          texts.each(function(d, i) {
            assert.strictEqual(d3.select(this).text(), expectedTexts[i], `formatter is applied to the displayed value (index ${i})`);
          });
        });

        it("shows labels inside or outside the bar as appropriate", () => {
          barPlot.labelsEnabled(true);

          const labels = barPlot.content().selectAll(".on-bar-label, .off-bar-label");
          assert.strictEqual(labels.size(), data.length, "one label drawn per datum");

          const bars = barPlot.content().select(".bar-area").selectAll("rect");
          labels.each((d, i) => {
            const labelBoundingClientRect = <any> (<SVGElement> labels[0][i]).getBoundingClientRect();
            const barBoundingClientRect = <any> (<SVGElement> bars[0][i]).getBoundingClientRect();
            if (labelBoundingClientRect[valueSizeAttr] > barBoundingClientRect[valueSizeAttr]) {
              assert.isTrue(d3.select(labels[0][i]).classed("off-bar-label"),
                `label with index ${i} doesn't fit and carries the off-bar class`);
            } else {
              assert.isTrue(d3.select(labels[0][i]).classed("on-bar-label"),
                `label with index ${i} fits and carries the on-bar class`);
            }
          });
        });

        it("shows labels for bars with value = baseline on the \"positive\" side of the baseline", () => {
          const zeroOnlyData = [ { base: 0, value: 0 } ];
          dataset.data(zeroOnlyData);
          barPlot.labelsEnabled(true);

          const label = barPlot.content().select("text");
          const labelBoundingRect = (<SVGElement> label.node()).getBoundingClientRect();
          const lineBoundingRect = (<SVGElement> barPlot.content().select(".baseline").node()).getBoundingClientRect();
          if (isVertical) {
            const labelPosition = labelBoundingRect.bottom - window.Pixel_CloseTo_Requirement;
            const linePosition = lineBoundingRect.top;
            assert.operator(labelPosition, "<=", linePosition, "label with value = baseline is drawn above the baseline");
          } else {
            const labelPosition = labelBoundingRect.left + window.Pixel_CloseTo_Requirement;
            const linePosition = lineBoundingRect.right;
            assert.operator(labelPosition, ">=", linePosition, "label with value = baseline is drawn to the right of the baseline");
          }
        });

        it("hides labels cut off by lower end of base scale", () => {
          barPlot.labelsEnabled(true);
          data.forEach((d, i) => {
            let texts = barPlot.content().selectAll("text");
            const centerOfText = getCenterOfText(<SVGElement> texts[0][i]);
            const centerValue = baseScale.invert(isVertical ? centerOfText.x : centerOfText.y);
            baseScale.domain([centerValue, centerValue + (DEFAULT_DOMAIN[1] - DEFAULT_DOMAIN[0])]);

            texts = barPlot.content().selectAll("text"); // re-select after rendering
            assert.strictEqual(d3.select(texts[0][i]).style("visibility"), "hidden", `label for bar with index ${i} is hidden`);
          });
          svg.remove();
        });

        it("hides labels cut off by upper end of base scale", () => {
          barPlot.labelsEnabled(true);
          data.forEach((d, i) => {
            let texts = barPlot.content().selectAll("text");
            const centerOfText = getCenterOfText(<SVGElement> texts[0][i]);
            const centerValue = baseScale.invert(isVertical ? centerOfText.x : centerOfText.y);
            baseScale.domain([centerValue - (DEFAULT_DOMAIN[1] - DEFAULT_DOMAIN[0]), centerValue]);

            texts = barPlot.content().selectAll("text"); // re-select after rendering
            assert.strictEqual(d3.select(texts[0][i]).style("visibility"), "hidden", `label for bar with index ${i} is hidden`);
          });
        });

        it("hides or shifts labels cut off by lower end of value scale", () => {
          barPlot.labelsEnabled(true);
          let labels = barPlot.content().selectAll(".on-bar-label, .off-bar-label");
          const centerValues = labels.select("text")[0].map((textNode) => {
            const centerOfText = getCenterOfText(<SVGElement> textNode);
            return valueScale.invert(isVertical ? centerOfText.y : centerOfText.x);
          });
          const wasOriginallyOnBar = labels[0].map((label) => d3.select(label).classed("on-bar-label"));

          data.forEach((d, i) => {
            const centerValue = centerValues[i];
            valueScale.domain([centerValue, centerValue + (DEFAULT_DOMAIN[1] - DEFAULT_DOMAIN[0])]);
            labels = barPlot.content().selectAll(".on-bar-label, .off-bar-label"); // re-select after rendering
            if (wasOriginallyOnBar[i] && d.value > 0) {
              assert.isTrue(d3.select(labels[0][i]).classed("off-bar-label"),
                `cut off on-bar label was switched to off-bar (index ${i})`);
            } else {
              const textNode = labels.select("text")[0][i];
              assert.strictEqual(d3.select(textNode).style("visibility"), "hidden", `label for bar with index ${i} is hidden`);
            }
          });
          svg.remove();
        });

        it("hides or shifts labels cut off by upper end of value scale", () => {
          barPlot.labelsEnabled(true);
          let labels = barPlot.content().selectAll(".on-bar-label, .off-bar-label");
          const centerValues = labels.select("text")[0].map((textNode) => {
            const centerOfText = getCenterOfText(<SVGElement> textNode);
            return valueScale.invert(isVertical ? centerOfText.y : centerOfText.x);
          });
          const wasOriginallyOnBar = labels[0].map((label) => d3.select(label).classed("on-bar-label"));

          data.forEach((d, i) => {
            const centerValue = centerValues[i];
            valueScale.domain([centerValue - (DEFAULT_DOMAIN[1] - DEFAULT_DOMAIN[0]), centerValue]);
            labels = barPlot.content().selectAll(".on-bar-label, .off-bar-label"); // re-select after rendering
            if (wasOriginallyOnBar[i] && d.value < 0) {
              assert.isTrue(d3.select(labels[0][i]).classed("off-bar-label"),
                `cut-off on-bar label was switched to off-bar (index ${i})`);
            } else {
              const textNode = labels.select("text")[0][i];
              assert.strictEqual(d3.select(textNode).style("visibility"), "hidden", `label for bar with index ${i} is hidden`);
            }
          });
        });

        // HACKHACK: This test is a bit hacky, but it seems to be testing for a bug fixed in
        // https://github.com/palantir/plottable/pull/1240 . Leaving it until we find a better way to test for it.
        it("removes labels instantly on dataset change", (done) => {
          barPlot.labelsEnabled(true);
          let texts = barPlot.content().selectAll("text");
          assert.strictEqual(texts.size(), dataset.data().length, "one label drawn per datum");
          const originalDrawLabels = (<any> barPlot)._drawLabels;
          let called = false;
          (<any> barPlot)._drawLabels = () => {
            if (!called) {
              originalDrawLabels.apply(barPlot);
              texts = barPlot.content().selectAll("text");
              assert.strictEqual(texts.size(), dataset.data().length, "texts were repopulated by drawLabels after the update");
              called = true; // for some reason, in phantomJS, `done` was being called multiple times and this caused the test to fail.
              done();
            }
          };
          dataset.data(dataset.data());
          texts = barPlot.content().selectAll("text");
          assert.strictEqual(texts.size(), 0, "texts were immediately removed");
        });

        afterEach(function() {
          if (this.currentTest.state === "passed") {
            barPlot.destroy();
            svg.remove();
          }
        });
      });

      describe(`retrieving Entities when ${orientation}`, () => {
        const data = [
          { base: 1, value: 1 },
          { base: 0, value: 0 },
          { base: -1, value: -1 }
        ];
        const DEFAULT_DOMAIN = [-2, 2];

        let svg: d3.Selection<void>;
        let barPlot: Plottable.Plots.Bar<number, number>;
        let baseScale: Plottable.Scales.Linear;
        let valueScale: Plottable.Scales.Linear;
        let dataset: Plottable.Dataset;

        beforeEach(() => {
          svg = TestMethods.generateSVG();
          barPlot = new Plottable.Plots.Bar<number, number>(orientation);
          baseScale = new Plottable.Scales.Linear();
          baseScale.domain(DEFAULT_DOMAIN);
          valueScale = new Plottable.Scales.Linear();
          valueScale.domain(DEFAULT_DOMAIN);
          if (orientation === Plottable.Plots.Bar.ORIENTATION_VERTICAL) {
            barPlot.x((d: any) => d.base, baseScale);
            barPlot.y((d: any) => d.value, valueScale);
          } else {
            barPlot.y((d: any) => d.base, baseScale);
            barPlot.x((d: any) => d.value, valueScale);
          }
          dataset = new Plottable.Dataset(data);
          barPlot.addDataset(dataset);
          barPlot.renderTo(svg);
        });

        it("returns the correct position for each Entity", () => {
          const entities = barPlot.entities();
          entities.forEach((entity, index) => {
            const xBinding = barPlot.x();
            const yBinding = barPlot.y();
            const scaledDataX = xBinding.scale.scale(xBinding.accessor(entity.datum, index, dataset));
            const scaledDataY = yBinding.scale.scale(yBinding.accessor(entity.datum, index, dataset));
            assert.strictEqual(scaledDataX, entity.position.x, "entities().position.x is equal to scaled x value");
            assert.strictEqual(scaledDataY, entity.position.y, "entities().position.y is equal to scaled y value");
          });
        });

        function getPointFromBaseAndValuePositions(basePosition: number, valuePosition: number) {
          return {
            x: isVertical ? basePosition : valuePosition,
            y: isVertical ? valuePosition : basePosition
          };
        }

        function expectedEntityForIndex(index: number) {
          const datum = data[index];
          const basePosition = baseScale.scale(datum.base);
          const valuePosition = valueScale.scale(datum.value);
          return {
            datum: datum,
            index: index,
            dataset: dataset,
            position: getPointFromBaseAndValuePositions(basePosition, valuePosition),
            selection: d3.select(barPlot.content().selectAll("rect")[0][index]),
            component: barPlot
          };
        }

        describe("retrieving the nearest Entity", () => {
          function testEntityNearest() {
            data.forEach((datum, index) => {
              const expectedEntity = expectedEntityForIndex(index);

              const barBasePosition = baseScale.scale(datum.base);

              const halfwayValuePosition = valueScale.scale((barPlot.baselineValue() + datum.value) / 2);
              const pointInsideBar = getPointFromBaseAndValuePositions(barBasePosition, halfwayValuePosition);
              const nearestInsideBar = barPlot.entityNearest(pointInsideBar);
              TestMethods.assertPlotEntitiesEqual(nearestInsideBar, expectedEntity, "retrieves the Entity for a bar if inside the bar");

              const abovePosition = valueScale.scale(2 * datum.value);
              const pointAboveBar = getPointFromBaseAndValuePositions(barBasePosition, abovePosition);
              const nearestAboveBar = barPlot.entityNearest(pointAboveBar);
              TestMethods.assertPlotEntitiesEqual(nearestAboveBar, expectedEntity, "retrieves the Entity for a bar if beyond the end of the bar");

              const belowPosition = valueScale.scale(-datum.value);
              const pointBelowBar = getPointFromBaseAndValuePositions(barBasePosition, belowPosition);
              const nearestBelowBar = barPlot.entityNearest(pointBelowBar);
              TestMethods.assertPlotEntitiesEqual(nearestBelowBar, expectedEntity,
                "retrieves the Entity for a bar if on the other side of the baseline from the bar");
            });
          }

          it("returns the closest by base, then by value", () => {
            testEntityNearest();
          });

          it("returns the closest visible bar", () => {
            baseScale.domain([DEFAULT_DOMAIN[0], 0.5]);
            const bar0BasePosition = baseScale.scale(data[0].base);
            const baselineValuePosition = valueScale.scale(barPlot.baselineValue());

            const nearestEntity = barPlot.entityNearest(getPointFromBaseAndValuePositions(bar0BasePosition, baselineValuePosition));
            const expectedEntity = expectedEntityForIndex(1); // nearest visible bar
            TestMethods.assertPlotEntitiesEqual(nearestEntity, expectedEntity, "returned Entity for nearest in-view bar");
          });

          it("considers bars cut off by the value scale", () => {
            valueScale.domain([-0.5, 0.5]);
            testEntityNearest();
          });

          it("considers bars cut off by the base scale", () => {
            baseScale.domain([-0.8, 0.8]);
            testEntityNearest();
          });

          it("returns undefined if no bars are visible", () => {
            baseScale.domain([100, 200]);
            const centerOfPlot = {
              x: barPlot.width() / 2,
              y: barPlot.height() / 2
            };
            const nearestEntity = barPlot.entityNearest(centerOfPlot);
            assert.isUndefined(nearestEntity, "returns undefined when no bars are in view");
          });
        });

        afterEach(function() {
          if (this.currentTest.state === "passed") {
            barPlot.destroy();
            svg.remove();
          }
        });
      });
    });

    describe("Vertical Bar Plot", () => {
      let svg: d3.Selection<void>;
      let dataset: Plottable.Dataset;
      let xScale: Plottable.Scales.Category;
      let yScale: Plottable.Scales.Linear;
      let barPlot: Plottable.Plots.Bar<string, number>;
      let SVG_WIDTH = 600;
      let SVG_HEIGHT = 400;

      beforeEach(() => {
        svg = TestMethods.generateSVG(SVG_WIDTH, SVG_HEIGHT);
        xScale = new Plottable.Scales.Category().domain(["A", "B"]);
        yScale = new Plottable.Scales.Linear();
        let data = [
          {x: "A", y: 1},
          {x: "B", y: -1.5},
          {x: "B", y: 1} // duplicate X-value
        ];
        dataset = new Plottable.Dataset(data);
        barPlot = new Plottable.Plots.Bar<string, number>();
        barPlot.addDataset(dataset);
        barPlot.animated(false);
        barPlot.baselineValue(0);
        yScale.domain([-2, 2]);
        barPlot.x((d) => d.x, xScale);
        barPlot.y((d) => d.y, yScale);
        barPlot.renderTo(svg);
      });

      it("entitiesAt()", () => {
        let bars = barPlot.entitiesAt({x: 155, y: 150}); // in the middle of bar 0

        assert.lengthOf(bars, 1, "entitiesAt() returns an Entity for the bar at the given location");
        assert.strictEqual(bars[0].datum, dataset.data()[0], "the data in the bar matches the data from the datasource");

        bars = barPlot.entitiesAt({x: -1, y: -1}); // no bars here
        assert.lengthOf(bars, 0, "returns empty array if no bars at query point");

        bars = barPlot.entitiesAt({x: 200, y: 50}); // between the two bars
        assert.lengthOf(bars, 0, "returns empty array if no bars at query point");

        bars = barPlot.entitiesAt({x: 155, y: 10}); // above bar 0
        assert.lengthOf(bars, 0, "returns empty array if no bars at query point");
        svg.remove();
      });

      it("entitiesIn()", () => {
        // the bars are now (140,100),(150,300) and (440,300),(450,350) - the
        // origin is at the top left!

        let bars = barPlot.entitiesIn({min: 155, max: 455}, {min: 150, max: 150});
        assert.lengthOf(bars, 2, "selected 2 bars (not the negative one)");
        assert.strictEqual(bars[0].datum, dataset.data()[bars[0].index], "the data in bar 0 matches the datasource");
        assert.strictEqual(bars[1].datum, dataset.data()[bars[1].index], "the data in bar 1 matches the datasource");

        bars = barPlot.entitiesIn({min: 155, max: 455}, {min: 150, max: 350});
        assert.lengthOf(bars, 3, "selected all the bars");
        assert.strictEqual(bars[0].datum, dataset.data()[bars[0].index], "the data in bar 0 matches the datasource");
        assert.strictEqual(bars[1].datum, dataset.data()[bars[1].index], "the data in bar 1 matches the datasource");
        assert.strictEqual(bars[2].datum, dataset.data()[bars[2].index], "the data in bar 2 matches the datasource");

        svg.remove();
      });
    });

    describe("Horizontal Bar Plot", () => {
      let svg: d3.Selection<void>;
      let dataset: Plottable.Dataset;
      let yScale: Plottable.Scales.Category;
      let xScale: Plottable.Scales.Linear;
      let barPlot: Plottable.Plots.Bar<number, string>;
      let SVG_WIDTH = 600;
      let SVG_HEIGHT = 400;
      beforeEach(() => {
        svg = TestMethods.generateSVG(SVG_WIDTH, SVG_HEIGHT);
        yScale = new Plottable.Scales.Category().domain(["A", "B"]);
        xScale = new Plottable.Scales.Linear();
        xScale.domain([-3, 3]);

        let data = [
          {y: "A", x: 1},
          {y: "B", x: -1.5},
          {y: "B", x: 1} // duplicate Y-value
        ];
        dataset = new Plottable.Dataset(data);
        barPlot = new Plottable.Plots.Bar<number, string>(Plottable.Plots.Bar.ORIENTATION_HORIZONTAL);
        barPlot.addDataset(dataset);
        barPlot.animated(false);
        barPlot.baselineValue(0);
        barPlot.x((d) => d.x, xScale);
        barPlot.y((d) => d.y, yScale);
        barPlot.renderTo(svg);
      });

      it("width projector may be overwritten, and calling project queues rerender", () => {
        let bars = (<any> barPlot)._renderArea.selectAll("rect");
        let bar0 = d3.select(bars[0][0]);
        let bar1 = d3.select(bars[0][1]);
        let bar0y = bar0.data()[0].y;
        let bar1y = bar1.data()[0].y;
        barPlot.attr("width", 10);
        assert.closeTo(TestMethods.numAttr(bar0, "height"), 10, 0.01, "bar0 height");
        assert.closeTo(TestMethods.numAttr(bar1, "height"), 10, 0.01, "bar1 height");
        assert.closeTo(TestMethods.numAttr(bar0, "width"), 100, 0.01, "bar0 width");
        assert.closeTo(TestMethods.numAttr(bar1, "width"), 150, 0.01, "bar1 width");
        assert.closeTo(TestMethods.numAttr(bar0, "y"), yScale.scale(bar0y) - TestMethods.numAttr(bar0, "height") / 2, 0.01, "bar0 ypos");
        assert.closeTo(TestMethods.numAttr(bar1, "y"), yScale.scale(bar1y) - TestMethods.numAttr(bar1, "height") / 2, 0.01, "bar1 ypos");
        svg.remove();
      });
    });

    describe("Horizontal Bar Plot extent calculation", () => {

      let svg: d3.Selection<void>;
      let xScale: Plottable.Scales.Linear;
      let yScale: Plottable.Scales.Linear;
      let plot: Plottable.Plots.Bar<number, number>;

      beforeEach(() => {
        svg = TestMethods.generateSVG();

        xScale = new Plottable.Scales.Linear();
        yScale = new Plottable.Scales.Linear();

        plot = new Plottable.Plots.Bar<number, number>(Plottable.Plots.Bar.ORIENTATION_HORIZONTAL);
        plot.x((d) => d.x, xScale);
        plot.y((d) => d.y, yScale);
      });

      it("pads the domain in the correct direction", () => {
        let data = Array.apply(null, Array(10)).map((d: any, i: number) => {
          return { x: i + 1, y: i + 1 };
        });
        plot.addDataset(new Plottable.Dataset(data));
        plot.renderTo(svg);

        assert.operator(yScale.domain()[0], "<", data[0].y, "lower end of the domain is padded");
        assert.operator(yScale.domain()[1], ">", data[data.length - 1].y, "higher end of the domain is padded");

        svg.remove();
      });

      it("computes the correct extent when autoDomain()-ing right after render", () => {
        let data = Array.apply(null, Array(10)).map((d: any, i: number) => {
          return { x: i + 1, y: i + 1 };
        });
        plot.addDataset(new Plottable.Dataset(data));
        plot.renderTo(svg);

        let initialYScaleDomain = yScale.domain();
        yScale.autoDomain();
        assert.deepEqual(initialYScaleDomain, yScale.domain(), "The domain did not change");

        svg.remove();
      });
    });

    it("updates the scale extent correctly when there is one bar (vertical)", () => {
      let svg = TestMethods.generateSVG();

      let xScale = new Plottable.Scales.Linear();
      let yScale = new Plottable.Scales.Linear();
      let xPoint = Math.max(xScale.domain()[0], xScale.domain()[1]) + 10;
      let data = [{x: xPoint, y: 10}];
      let dataset = new Plottable.Dataset(data);

      let barPlot = new Plottable.Plots.Bar();
      barPlot.datasets([dataset]);
      barPlot.x(function(d) { return d.x; }, xScale);
      barPlot.y(function(d) { return d.y; }, yScale);

      barPlot.renderTo(svg);
      let xScaleDomain = xScale.domain();
      assert.operator(xPoint, ">=", xScaleDomain[0], "x value greater than new domain min");
      assert.operator(xPoint, "<=", xScaleDomain[1], "x value less than new domain max");
      svg.remove();
    });

    it("updates the scale extent correctly when there is one bar (horizontal)", () => {
      let svg = TestMethods.generateSVG();

      let xScale = new Plottable.Scales.Linear();
      let yScale = new Plottable.Scales.Linear();
      let yPoint = Math.max(yScale.domain()[0], yScale.domain()[1]) + 10;
      let data = [{x: 10, y: yPoint}];
      let dataset = new Plottable.Dataset(data);

      let barPlot = new Plottable.Plots.Bar(Plottable.Plots.Bar.ORIENTATION_HORIZONTAL);
      barPlot.datasets([dataset]);
      barPlot.x(function(d) { return d.x; }, xScale);
      barPlot.y(function(d) { return d.y; }, yScale);

      barPlot.renderTo(svg);
      let yScaleDomain = yScale.domain();
      assert.operator(yPoint, ">=", yScaleDomain[0], "y value greater than new domain min");
      assert.operator(yPoint, "<=", yScaleDomain[1], "y value less than new domain max");
      svg.remove();
    });
  });
});
