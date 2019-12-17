import wxapi from "babyfs-wxapp-api";

let list = [];
(() => {
  for (let index = 0; index < 9; index++) {
    list.push({
      id: index,
      itemDom: {
        width: 0,
        height: 0,
        top: 0,
        left: 0
      },
      listContainerDom: null
    });
  }
})(list);

Page({
  data: {
    list,
    itemStyle: "",
    curIndex: -1, // 当前拖拽对象的下标 默认值是-1

    // 非视图层
    dragFlag: false, // 拖拽标志位
    // 需要translate的偏移量
    translateX: 0,
    translateY: 0,
    translateZ: 0,
    // translate之前的起始位置
    startX: 0,
    startY: 0,
    device: null
  },
  async onReady() {
    const device = await wxapi.getSystemInfoAsync();
    console.log("device", device);
    this.setData({ device });
    this.initDom();
  },
  async longpress(event) {
    this.setData({ dragFlag: true });
    const curIndex = event.target.dataset.index;
    if (curIndex < 0) {
      await wxapi.showToastAsync({ title: "error: curIndex为空" });
      return false;
    }
    // await wxapi.vibrateShortAsync();
    let translateX, translateY, translateZ;
    const touches = event.touches[0];
    const { pageX: startX, pageY: startY } = { ...touches };
    const { itemDom } = { ...this.data.list[curIndex] };
    const originX = itemDom.width / 2 + itemDom.left;
    const originY = itemDom.height / 2 + itemDom.top;

    translateX = startX - originX;
    translateY = startY - originY;
    translateZ = 0;

    console.log(curIndex, startX, startY);
    const itemStyle = `transform: translate3d(${translateX}px, ${translateY}px, ${translateZ}px)`;
    this.setData({
      curIndex,
      itemStyle,
      startX,
      startY,
      translateX,
      translateY,
      translateZ
    });
  },

  async touchmove(event) {
    if (!this.data.dragFlag) {
      return false;
    }
    let translateX, translateY, translateZ;
    const touches = event.touches[0];
    const { pageX: moveX, pageY: moveY } = { ...touches };
    const { translateX: originX, translateY: originY, startX, startY } = {
      ...this.data
    };
    translateX = moveX - startX + originX;
    translateY = moveY - startY + originY;
    translateZ = 0;
    const itemStyle = `transform: translate3d(${translateX}px, ${translateY}px, ${translateZ}px)`;
    this.setData({
      itemStyle,
      startX: moveX,
      startY: moveY,
      translateX,
      translateY,
      translateZ
    });
    // console.log(this.data.curIndex, translateX, translateY);

    const rows = 3;
    const columns = 3;

    const curColumn = Math.round(
      (translateX / this.data.listContainerDom.width) * columns
    );
    const curRow = Math.round(
      (translateY / this.data.listContainerDom.height) * rows
    );

    console.log("curColumn", curColumn);
    console.log("curRow", curRow);
  },

  async touchend(event) {
    this.clearAll();
  },

  // 初始化dom信息
  initDom() {
    const list = this.data.list;
    list.map(item => {
      wxapi
        .createSelectorQuery()
        .select(`.item_${item.id}`)
        .boundingClientRect(itemDom => {
          list[item.id]["itemDom"] = itemDom;
          this.setData({ list });
        })
        .exec();
    });

    wxapi
      .createSelectorQuery()
      .select(".container")
      .boundingClientRect(containerDom => {
        const listContainerDom = containerDom;
        this.setData({ listContainerDom });
      })
      .exec();
  },

  // 重置所有的装填
  clearAll() {
    const itemStyle = `transform: translate3d(0, 0, 0)`;
    this.setData({
      curIndex: -1,
      dragFlag: false,
      translateX: 0,
      translateY: 0,
      translateZ: 0,
      startX: 0,
      startY: 0,
      itemStyle
    });
  }
});
