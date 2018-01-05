const Util = require('../../util/common');
const Legend = require('./legend');
const Marker = require('../marker');

// TODOList:
// 2. 事件支持

class CategoryLegend extends Legend {
  getDefaultCfg() {
    return {
      /**
       * 图例的标题，默认不展示
       * @type {?Object}
       */
      title: null,
      /**
       * 图例项的集合
       * @type {?Array}
       */
      items: null,
      /**
       * 标题距离图例项的间距
       * @type {Number}
       */
      titleGap: 12,
      /**
       * 水平布局中，各个图例项之间的间距
       * @type {Number}
       */
      itemGap: 24,
      /**
       * 各个图例项下方留白的间距
       * @type {Number}
       */
      itemMarginBottom: 12,
      /**
       * 各个图例项上方留白的间距
       * @type {Number}
       */
      itemMarginTop: 0,
      /**
       * 图例项被取消选中的颜色
       * @type {String}
       */
      unCheckColor: '#bfbfbf',
      /**
       * 图例项文本内容格式化
       * @type {[type]}
       */
      itemFormatter: null,
      /**
       * 图例项是否可点击
       * @type {Boolean}
       */
      clickable: true,
      /**
       * 图例项的选择模式，可设置值为 single（单选） 和 multiple（多选，默认值）
       * @type {String}
       */
      selectedMode: 'multiple',
      /**
       * 图例的点击逻辑
       * @type {?Function}
       */
      onClick: null,
      /**
       * 图例项文本样式
       * @type {Object}
       */
      textStyle: {
        fill: '#8C8C8C',
        fontSize: 12,
        textAlign: 'start',
        textBaseline: 'middle',
        lineHeight: 20
      },
      /**
       * marker 和文字的距离
       * @type {Number}
       */
      wordSpace: 8,
      /**
       * 是否自动换行，默认为 true
       * @type {Boolean}
       */
      autoWrap: true
    };
  }

  renderItems() {
    const self = this;
    const { items, reversed } = self;

    if (reversed) {
      items.reverse();
    }

    Util.each(items, (item, index) => {
      self._addItem(item, index);
    });

    this.autoWrap && this._adjustItems(); // 默认自动换行
  }

  _addItem(item) {
    const itemsGroup = this.itemsGroup;
    const x = this._getNextX();
    const y = this._getNextY();
    const unCheckColor = this.unCheckColor;
    const itemGroup = itemsGroup.addGroup({
      x,
      y,
      value: item.value,
      checked: item.checked
    });

    const textStyle = this.textStyle;
    const wordSpace = this.wordSpace;
    let startX = 0;

    if (item.marker) { // 如果有marker添加marker
      const markerAttrs = Util.mix({}, item.marker, {
        x: item.marker.radius + x,
        y
      });

      if (!item.checked) {
        if (markerAttrs.fill) {
          markerAttrs.fill = unCheckColor;
        }
        if (markerAttrs.stroke) {
          markerAttrs.stroke = unCheckColor;
        }
      }
      // let symbol = item.marker.symbol;
      // symbol = Util.isFunction(symbol) ? symbol : Marker[symbol];
      const markerShape = new Marker({
        className: 'legeng-marker',
        attrs: markerAttrs
      });
      itemGroup.add(markerShape);
      // const markerShape = itemGroup.addShape('Marker', {
      //   className: 'legeng-marker',
      //   attrs: markerAttrs,
      //   createPath: symbol
      // });
      startX += markerShape.getBBox().width + wordSpace;
    }

    const textAttrs = Util.mix({}, textStyle, {
      x: startX + x,
      y,
      text: this._formatItemValue(item.value)
    });
    if (!item.checked) {
      Util.mix(textAttrs, {
        fill: unCheckColor
      });
    }

    itemGroup.addShape('text', {
      className: 'legend-text',
      attrs: textAttrs
    });

    // 添加一个包围矩形，用于事件支持
    const bbox = itemGroup.getBBox();
    const itemWidth = this.itemWidth;
    itemGroup.addShape('rect', {
      className: 'legend-item',
      attrs: {
        x,
        y: y - bbox.height / 2,
        fill: '#fff',
        fillOpacity: 0,
        width: itemWidth || bbox.width,
        height: bbox.height
      }
    });
    return itemGroup;
  }

  _getNextX() {
    const { layout, itemGap, itemsGroup, itemWidth } = this;
    const children = itemsGroup.get('children');
    let nextX = 0;
    if (layout === 'horizontal') { // 水平布局
      for (let i = 0, len = children.length; i < len; i++) {
        const child = children[i];
        nextX += (itemWidth ? itemWidth : child.getBBox().width) + itemGap;
      }
    }
    return nextX;
  }

  _getNextY() {
    const { itemMarginBottom, layout, itemsGroup, titleShape } = this;
    const titleGap = titleShape ? this.titleGap : 0;
    const children = itemsGroup.get('children');

    let nextY = titleGap;
    if (titleShape) {
      nextY += titleShape.getBBox().height;
    }

    if (layout === 'vertical') { // 竖直布局
      for (let i = 0, len = children.length; i < len; i++) {
        const child = children[i];
        nextY += child.getBBox().height + itemMarginBottom;
      }
    }
    return nextY;
  }

  _formatItemValue(value) {
    const formatter = this.itemFormatter;
    if (formatter) {
      value = formatter.call(this, value);
    }
    return value;
  }

  _adjustHorizontal() {
    const maxLength = this.maxLength;
    if (Util.isNil(maxLength)) {
      return;
    }
    const itemsGroup = this.itemsGroup;
    const children = itemsGroup.get('children');
    const itemGap = this.itemGap;
    const itemMarginBottom = this.itemMarginBottom;
    const titleShape = this.titleShape;
    let titleGap = 0;
    if (titleShape) {
      titleGap = titleShape.getBBox().height + this.titleGap;
    }

    let row = 0;
    let rowLength = 0;
    let width;
    let height;
    let box;
    const itemWidth = this.itemWidth;
    if (itemsGroup.getBBox().width > maxLength) {
      for (let i = 0, len = children.length; i < len; i++) {
        const child = children[i];
        box = child.getBBox();
        width = itemWidth || box.width;
        height = box.height + itemMarginBottom;

        if (maxLength - rowLength < width) {
          row++;
          rowLength = 0;
        }

        child.moveTo(rowLength, row * height + titleGap);
        rowLength += width + itemGap;
      }
    }
    return;
  }

  _adjustVertical() {
    const maxLength = this.maxLength; // 垂直布局，则 maxLength 代表容器的高度
    if (Util.isNil(maxLength)) {
      return;
    }
    const itemsGroup = this.itemsGroup;
    const titleShape = this.titleShape;
    const children = itemsGroup.get('children');
    const itemGap = this.itemGap;
    const itemMarginBottom = this.itemMarginBottom;
    const titleGap = this.titleGap;
    const titleHeight = titleShape ? titleShape.getBBox().height + titleGap : 0;
    const itemWidth = this.itemWidth;
    let colLength = titleHeight;
    let width;
    let height;
    let box;
    let maxItemWidth = 0;
    let totalLength = 0;

    if (itemsGroup.getBBox().height > maxLength) {
      Util.each(children, function(v) {
        box = v.getBBox();
        width = box.width;
        height = box.height;

        if (itemWidth) {
          maxItemWidth = itemWidth + itemGap;
        } else if (width > maxItemWidth) {
          maxItemWidth = width + itemGap;
        }

        if (maxLength - colLength < height) {
          colLength = titleHeight;
          totalLength += maxItemWidth;
          v.moveTo(totalLength, titleHeight);
        } else {
          v.moveTo(totalLength, colLength);
        }

        colLength += height + itemMarginBottom;
      });
    }
    return;
  }

  _adjustItems() {
    const layout = this.layout;
    if (layout === 'horizontal') {
      this._adjustHorizontal();
    } else {
      this._adjustVertical();
    }
  }
}

module.exports = CategoryLegend;