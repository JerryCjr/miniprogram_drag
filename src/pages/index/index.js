import wxapi from 'babyfs-wxapp-api';

let list = [];
(() => {
  for (let index = 0; index < 9; index++) {
    list.push({
      id: index,
      key: index,
      data: {
        name: `${index}元素`
      },
      fixed: false,
      x: 0,
      y: 0,
      z: 0
    });
  }
  list[7].fixed = true;
})(list);

Page({
  data: {
    list, // 列表数据

    columns: 4, // 支持列数

    curIndex: -1, // 当前拖拽对象的下标 默认值是-1

    preOriginKey: -1,

    itemTransition: false,

    itemWrapHeight: 0,
    itemDom: null,

    // 需要translate的偏移量
    translateX: 0,
    translateY: 0,
    translateZ: 0
  },
  customData: {
    startTouches: null,
    moveTouches: null,
    startTranslateX: 0,
    startTranslateY: 0,
    device: null,
    dragging: false // 拖拽标志位
  },
  async onReady() {
    this.customData.device = await wxapi.getSystemInfoAsync();
    await this.initDom();
  },
  async longpress(event) {
    const touches = event.changedTouches[0];
    if (!touches) return false; // 非法touches 退出
    // TODO: startTouch 包含的信息不需要应用到视图 应该把startPageX startPageY全部迁移到这里
    this.customData.startTouches = touches;

    if (this.customData.dragging) return false; // 正在拖拽 退出
    this.customData.dragging = true;

    const curIndex = event.currentTarget.dataset.index;
    if (this.isFixed(curIndex)) return false; // 固定列 退出

    // console.log(touches, this.customData.dragging, curIndex);
    await this.vibrateHandler();

    let translateX = 0;
    let translateY = 0;
    let translateZ = 0;

    const { pageX: startPageX, pageY: startPageY } = { ...touches };
    const { itemDom, itemWrapDom } = { ...this.data };
    // const originX = itemDom.width / 2 + itemDom.left; // 中心点的初始x偏移
    // const originY = itemDom.height / 2 + itemDom.top; // 中心点的初始y偏移

    const originX = itemDom.width / 2 + itemWrapDom.left; // 中心点的初始x偏移
    const originY = itemDom.height / 2 + itemWrapDom.top; // 中心点的初始y偏移

    if (this.data.columns > 1) {
      // 多列的时候计算X轴初始位移, 使 item 水平中心移动到点击处
      translateX = startPageX - originX;
    }
    translateY = startPageY - originY;
    translateZ = 0;

    this.customData.startTranslateX = translateX; // 长按之后的中心点位移
    this.customData.startTranslateY = translateY;

    // console.log(startPageX);
    // console.log(startPageY);
    // console.log(originX);
    // console.log(originY);
    // console.log(translateX);
    // console.log(translateY);

    this.setData({
      curIndex,
      curZIndex: curIndex, // TODO: 注释
      translateX,
      translateY,
      translateZ
    });
  },

  async touchmove(event) {
    const touches = event.changedTouches[0];
    if (!touches) return false;

    if (!this.customData.dragging) return false; // 正在拖拽 退出

    // TODO: startTouch 包含的信息不需要应用到视图 应该把startPageX startPageY全部迁移到这里
    this.customData.moveTouches = touches;

    // 如果不是同一个触发点则返回
    if (
      this.customData.startTouches.identifier !==
      this.customData.moveTouches.identifier
    ) {
      return false;
    }

    let translateX = 0;
    let translateY = 0;
    let translateZ = 0;

    const { pageX: startPageX, pageY: startPageY } = {
      ...this.customData.startTouches
    };

    const { pageX: movePageX, pageY: movePageY } = {
      ...this.customData.moveTouches
    };

    const durationX = movePageX - startPageX; // 手指偏移量
    const durationY = movePageY - startPageY;

    translateX = durationX + this.customData.startTranslateX; // 手指偏移量 + 初始位置
    translateY = durationY + this.customData.startTranslateY;
    translateZ = 0;

    if (this.data.columns === 1) translateX = 0;

    // TODO: 超过一屏的情况如何处理
    this.setData({
      translateX,
      translateY,
      translateZ
    });

    // originKey endKey
    const originKey = parseInt(event.currentTarget.dataset.key);
    const endKey = this.calculateTheEndKey(translateX, translateY);

    if (this.isFixed(endKey)) return false; // 如果是固定 item 则 return

    // 防止拖拽过程中发生乱序问题
    const { preOriginKey } = { ...this.data };
    if (originKey === endKey || preOriginKey === originKey) return false;
    this.setData({ preOriginKey: originKey });

    console.log(originKey);
    console.log(endKey);
    console.log(preOriginKey);

    this.insert(originKey, endKey); // 触发排序
  },

  async touchend(event) {
    if (!this.customData.dragging) return;
    this.clearAll();
  },

  /**
   * 根据起始key和目标key去重新计算每一项的新的key
   */
  insert(origin, end) {
    this.setData({ itemTransition: true });
    let list;
    if (origin < end) {
      // 正序拖动
      list = this.data.list.map(item => {
        if (item.fixed) return item;
        if (item.key > origin && item.key <= end) {
          item.key = this.l2r(item.key - 1, origin);
        } else if (item.key === origin) {
          item.key = end;
        }
        return item;
      });
      this.getPosition(list);
    } else if (origin > end) {
      // 倒序拖动
      list = this.data.list.map(item => {
        if (item.fixed) return item;
        if (item.key >= end && item.key < origin) {
          item.key = this.r2l(item.key + 1, origin);
        } else if (item.key === origin) {
          item.key = end;
        }
        return item;
      });
      this.getPosition(list);
    }
  },
  /**
   * 正序拖动 key 值和固定项判断逻辑
   */
  l2r(key, origin) {
    if (key === origin) return origin;
    if (this.data.list[key].fixed) {
      return this.l2r(key - 1, origin);
    } else {
      return key;
    }
  },
  /**
   * 倒序拖动 key 值和固定项判断逻辑
   */
  r2l(key, origin) {
    if (key === origin) return origin;
    if (this.data.list[key].fixed) {
      return this.r2l(key + 1, origin);
    } else {
      return key;
    }
  },

  // 初始化dom信息
  async initDom() {
    this.clearAll();
    this.setData({ itemTransition: false });
    let list = [...this.data.list];
    await this.getPosition(list, false);
    wxapi
      .createSelectorQuery()
      .select('.item')
      .boundingClientRect(res => {
        let rows = Math.ceil(this.data.list.length / this.data.columns);
        this.setData({
          itemDom: res,
          itemWrapHeight: rows * res.height
        });

        console.log(this.data.itemDom);

        wxapi
          .createSelectorQuery()
          .select('.container')
          .boundingClientRect(res => {
            this.setData({
              itemWrapDom: res
            });
            console.log(this.data.itemWrapDom);
          })
          .exec();
      })
      .exec();
  },

  // 获取位置信息
  async getPosition(data, vibrate = true) {
    let list = data.map(item => {
      item.x = item.key % this.data.columns;
      item.y = Math.floor(item.key / this.data.columns);
      return item;
    });
    console.log(list)
    this.setData({ list });
    // if (!vibrate) return;
    // await this.vibrateHandler();
    // let listData = [];
    // list.forEach(item => {
    //   listData[item.key] = item.data;
    // });
    // console.log(list);
    // TODO: 通知父组件 listData数据更改
    // this.triggerEvent("change", { listData: listData });
  },

  // calculate the end key
  calculateTheEndKey(translateX, translateY) {
    let { itemDom } = this.data;

    let rows = Math.ceil(this.data.list.length / this.data.columns);
    let curColumn = Math.round(translateX / itemDom.width);
    let curRow = Math.round(translateY / itemDom.height);

    if (curColumn > this.data.columns - 1) {
      curColumn = this.data.columns - 1;
    } else if (curColumn < 0) {
      curColumn = 0;
    }

    if (curRow > rows - 1) {
      curRow = rows - 1;
    } else if (curRow < 0) {
      curRow = 0;
    }

    let endKey = curColumn + this.data.columns * curRow;
    if (endKey >= this.data.list.length) {
      endKey = this.data.list.length - 1;
    }

    return endKey;
  },

  // 是否是固定列
  isFixed(key) {
    let list = [...this.data.list];
    return list && list[key] && list[key].fixed;
  },

  async vibrateHandler() {
    if (this.customData.device.platform !== 'devtools') {
      await wxapi.vibrateShortAsync();
    }
  },

  // 重置所有的装填
  clearAll() {
    this.setData({
      curIndex: -1,
      preOriginKey: -1,

      translateX: 0,
      translateY: 0,
      translateZ: 0
    });
    // 延迟清空
    setTimeout(() => {
      this.setData({
        curZIndex: -1
      });
    }, 300);
    this.customData.dragging = false;
    this.customData.startTouches = null;
    this.customData.moveTouches = null;
    this.customData.startTranslateX = 0;
    this.customData.startTranslateY = 0;
  }
});
