export default function(Chart) {

	var defaults = Chart.defaults;
	var helpers = Chart.helpers;
	var layouts = Chart.layouts;

	// Ported from Chart.js 2.7.2. Modified for style tooltip.
	// Generates labels shown in the legend
	defaults.global.legend.labels.generateLabels = function(chart) {
		var data = chart.data;
		return helpers.isArray(data.datasets) ? data.datasets.map(function(dataset, i) {
			return {
				text: dataset.label,
				fillStyle: (!helpers.isArray(dataset.backgroundColor) ? dataset.backgroundColor : dataset.backgroundColor[0]),
				hidden: !chart.isDatasetVisible(i),
				lineCap: dataset.borderCapStyle,
				lineDash: dataset.borderDash,
				lineDashOffset: dataset.borderDashOffset,
				lineJoin: dataset.borderJoinStyle,
				lineWidth: dataset.borderWidth,
				strokeStyle: dataset.borderColor,
				pointStyle: dataset.pointStyle,

				shadowOffsetX: (!helpers.isArray(dataset.shadowOffsetX) ? dataset.shadowOffsetX : dataset.shadowOffsetX[0]),
				shadowOffsetY: (!helpers.isArray(dataset.shadowOffsetY) ? dataset.shadowOffsetY : dataset.shadowOffsetY[0]),
				shadowBlur: (!helpers.isArray(dataset.shadowBlur) ? dataset.shadowBlur : dataset.shadowBlur[0]),
				shadowColor: (!helpers.isArray(dataset.shadowColor) ? dataset.shadowColor : dataset.shadowColor[0]),

				// Below is extra data used for toggling the datasets
				datasetIndex: i
			};
		}, this) : [];
	};

	/**
	 * Ported from Chart.js 2.7.2. Modified for style tooltip.
	 *
	 * Helper function to get the box width based on the usePointStyle option
	 * @param labelopts {Object} the label options on the legend
	 * @param fontSize {Number} the label font size
	 * @return {Number} width of the color box area
	 */
	function getBoxWidth(labelOpts, fontSize) {
		return labelOpts.usePointStyle ?
			fontSize * Math.SQRT2 :
			labelOpts.boxWidth;
	}

	var StyleLegend = Chart.Legend.extend({

		// Ported from Chart.js 2.7.2. Modified for style tooltip.
		// Actually draw the legend on the canvas
		draw: function() {
			var me = this;
			var opts = me.options;
			var labelOpts = opts.labels;
			var globalDefault = defaults.global;
			var lineDefault = globalDefault.elements.line;
			var legendWidth = me.width;
			var lineWidths = me.lineWidths;

			if (opts.display) {
				var ctx = me.ctx;
				var valueOrDefault = helpers.valueOrDefault;
				var fontColor = valueOrDefault(labelOpts.fontColor, globalDefault.defaultFontColor);
				var fontSize = valueOrDefault(labelOpts.fontSize, globalDefault.defaultFontSize);
				var fontStyle = valueOrDefault(labelOpts.fontStyle, globalDefault.defaultFontStyle);
				var fontFamily = valueOrDefault(labelOpts.fontFamily, globalDefault.defaultFontFamily);
				var labelFont = helpers.fontString(fontSize, fontStyle, fontFamily);
				var cursor;

				// Canvas setup
				ctx.textAlign = 'left';
				ctx.textBaseline = 'middle';
				ctx.lineWidth = 0.5;
				ctx.strokeStyle = fontColor; // for strikethrough effect
				ctx.fillStyle = fontColor; // render in correct colour
				ctx.font = labelFont;

				var boxWidth = getBoxWidth(labelOpts, fontSize);
				var hitboxes = me.legendHitBoxes;

				// current position
				var drawLegendBox = function(x, y, legendItem) {
					if (isNaN(boxWidth) || boxWidth <= 0) {
						return;
					}

					// Set the ctx for the box
					ctx.save();

					ctx.fillStyle = valueOrDefault(legendItem.fillStyle, globalDefault.defaultColor);
					ctx.lineCap = valueOrDefault(legendItem.lineCap, lineDefault.borderCapStyle);
					ctx.lineDashOffset = valueOrDefault(legendItem.lineDashOffset, lineDefault.borderDashOffset);
					ctx.lineJoin = valueOrDefault(legendItem.lineJoin, lineDefault.borderJoinStyle);
					ctx.lineWidth = valueOrDefault(legendItem.lineWidth, lineDefault.borderWidth);
					ctx.strokeStyle = valueOrDefault(legendItem.strokeStyle, globalDefault.defaultColor);
					var isLineWidthZero = (valueOrDefault(legendItem.lineWidth, lineDefault.borderWidth) === 0);

					if (ctx.setLineDash) {
						// IE 9 and 10 do not support line dash
						ctx.setLineDash(valueOrDefault(legendItem.lineDash, lineDefault.borderDash));
					}

					ctx.shadowOffsetX = valueOrDefault(legendItem.shadowOffsetX, lineDefault.shadowOffsetX);
					ctx.shadowOffsetY = valueOrDefault(legendItem.shadowOffsetY, lineDefault.shadowOffsetY);
					ctx.shadowBlur = valueOrDefault(legendItem.shadowBlur, lineDefault.shadowBlur);
					ctx.shadowColor = valueOrDefault(legendItem.shadowColor, lineDefault.shadowColor);

					if (opts.labels && opts.labels.usePointStyle) {
						// Recalculate x and y for drawPoint() because its expecting
						// x and y to be center of figure (instead of top left)
						var radius = fontSize * Math.SQRT2 / 2;
						var offSet = radius / Math.SQRT2;
						var centerX = x + offSet;
						var centerY = y + offSet;

						// Draw pointStyle as legend symbol
						helpers.canvas.drawPoint(ctx, legendItem.pointStyle, radius, centerX, centerY);
					} else {
						// Draw box as legend symbol
						if (!isLineWidthZero) {
							ctx.strokeRect(x, y, boxWidth, fontSize);
						}
						ctx.fillRect(x, y, boxWidth, fontSize);
					}

					ctx.restore();
				};
				var fillText = function(x, y, legendItem, textWidth) {
					var halfFontSize = fontSize / 2;
					var xLeft = boxWidth + halfFontSize + x;
					var yMiddle = y + halfFontSize;

					ctx.fillText(legendItem.text, xLeft, yMiddle);

					if (legendItem.hidden) {
						// Strikethrough the text if hidden
						ctx.beginPath();
						ctx.lineWidth = 2;
						ctx.moveTo(xLeft, yMiddle);
						ctx.lineTo(xLeft + textWidth, yMiddle);
						ctx.stroke();
					}
				};

				// Horizontal
				var isHorizontal = me.isHorizontal();
				if (isHorizontal) {
					cursor = {
						x: me.left + ((legendWidth - lineWidths[0]) / 2),
						y: me.top + labelOpts.padding,
						line: 0
					};
				} else {
					cursor = {
						x: me.left + labelOpts.padding,
						y: me.top + labelOpts.padding,
						line: 0
					};
				}

				var itemHeight = fontSize + labelOpts.padding;
				helpers.each(me.legendItems, function(legendItem, i) {
					var textWidth = ctx.measureText(legendItem.text).width;
					var width = boxWidth + (fontSize / 2) + textWidth;
					var x = cursor.x;
					var y = cursor.y;

					if (isHorizontal) {
						if (x + width >= legendWidth) {
							y = cursor.y += itemHeight;
							cursor.line++;
							x = cursor.x = me.left + ((legendWidth - lineWidths[cursor.line]) / 2);
						}
					} else if (y + itemHeight > me.bottom) {
						x = cursor.x = x + me.columnWidths[cursor.line] + labelOpts.padding;
						y = cursor.y = me.top + labelOpts.padding;
						cursor.line++;
					}

					drawLegendBox(x, y, legendItem);

					hitboxes[i].left = x;
					hitboxes[i].top = y;

					// Fill the actual label
					fillText(x, y, legendItem, textWidth);

					if (isHorizontal) {
						cursor.x += width + (labelOpts.padding);
					} else {
						cursor.y += itemHeight;
					}

				});
			}
		},
	});

	// Ported from Chart.js 2.7.2. Modified for style tooltip.
	function createNewLegendAndAttach(chart, legendOpts) {
		var legend = new StyleLegend({
			ctx: chart.ctx,
			options: legendOpts,
			chart: chart
		});

		layouts.configure(chart, legend, legendOpts);
		layouts.addBox(chart, legend);
		chart.legend = legend;
	}

	return {
		id: 'legend',

		_element: StyleLegend,

		// Ported from Chart.js 2.7.2. Modified for style tooltip.
		beforeInit: function(chart) {
			var legendOpts = chart.options.legend;

			if (legendOpts) {
				createNewLegendAndAttach(chart, legendOpts);
			}
		},

		// Ported from Chart.js 2.7.2. Modified for style tooltip.
		beforeUpdate: function(chart) {
			var legendOpts = chart.options.legend;
			var legend = chart.legend;

			if (legendOpts) {
				helpers.mergeIf(legendOpts, defaults.global.legend);

				if (legend) {
					layouts.configure(chart, legend, legendOpts);
					legend.options = legendOpts;
				} else {
					createNewLegendAndAttach(chart, legendOpts);
				}
			} else if (legend) {
				layouts.removeBox(chart, legend);
				delete chart.legend;
			}
		},

		// Ported from Chart.js 2.7.2. Modified for style tooltip.
		afterEvent: function(chart, e) {
			var legend = chart.legend;
			if (legend) {
				legend.handleEvent(e);
			}
		}
	};
}