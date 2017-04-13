import React, { Component, PropTypes } from 'react';
import { getSupportedEvents, coordX, coordY } from './TouchUtils';
import removeObjectKeys from '../../lib/removeObjectKeys';

const events = getSupportedEvents();

export default class Touch extends Component {
  cancelClick = false;
  gesture = {};

  static propTypes = {
    onStart: PropTypes.func,
    onStartX: PropTypes.func,
    onStartY: PropTypes.func,
    onMove: PropTypes.func,
    onMoveX: PropTypes.func,
    onMoveY: PropTypes.func,
    onEnd: PropTypes.func,
    onEndX: PropTypes.func,
    onEndY: PropTypes.func,
    component: PropTypes.string,
    children: PropTypes.node
  };
  static defaultProps = {
    component: 'div',
    children: ''
  };

  /**
   * Обработчик событий touchstart
   *
   * @param {Object} e Браузерное событие
   * @param {Object} props Component props
   * @returns {void}
   */
  onStart = (e) => {
    this.gesture = {
      startX: coordX(e),
      startY: coordY(e),
      startT: new Date(),
      isPressed: true
    };

    // Вызываем нужные колбеки из props
    const outputEvent = Object.assign({}, this.gesture, {
      originalEvent: e
    });

    if (this.props.onStart) {
      this.props.onStart(outputEvent);
    }

    if (this.props.onStartX) {
      this.props.onStartX(outputEvent);
    }

    if (this.props.onStartY) {
      this.props.onStartY(outputEvent);
    }

    document.addEventListener(events[1], this.onMove);
    document.addEventListener(events[2], this.onEnd);
    document.addEventListener(events[3], this.onEnd);
  }

  /**
   * Обработчик событий touchmove
   *
   * @param {Object} e Браузерное событие
   * @param {Object} props Component props
   * @returns {void}
   */
  onMove = (e) => {
    const { isPressed, isX, isY, startX, startY } = this.gesture;

    if (isPressed) {
      // смещения
      const shiftX = coordX(e) - startX;
      const shiftY = coordY(e) - startY;

      // абсолютные значения смещений
      const shiftXAbs = Math.abs(shiftX);
      const shiftYAbs = Math.abs(shiftY);

      // Если определяем мультитач, то прерываем жест
      if (!!e.touches && e.touches.length > 1) {
        return this.onEnd(e);
      }

      // если мы ещё не определились
      if (!isX && !isY) {
        let willBeX = shiftXAbs >= 5 && shiftXAbs > shiftYAbs;
        let willBeY = shiftYAbs >= 5 && shiftYAbs > shiftXAbs;
        let willBeSlidedX = (willBeX && !!this.props.onMoveX) || !!this.props.onMove;
        let willBeSlidedY = (willBeY && !!this.props.onMoveY) || !!this.props.onMove;

        this.gesture.isY = willBeY;
        this.gesture.isX = willBeX;
        this.gesture.isSlideX = willBeSlidedX;
        this.gesture.isSlideY = willBeSlidedY;
        this.gesture.isSlide = willBeSlidedX || willBeSlidedY;
      }

      if (this.gesture.isSlide) {
        this.gesture.shiftX = shiftX;
        this.gesture.shiftY = shiftY;
        this.gesture.shiftXAbs = shiftXAbs;
        this.gesture.shiftYAbs = shiftYAbs;

        // Вызываем нужные колбеки из props
        const outputEvent = Object.assign({}, this.gesture, {
          originalEvent: e
        });

        if (this.props.onMove) {
          this.props.onMove(outputEvent);
        }

        if (this.gesture.isSlideX && this.props.onMoveX) {
          this.props.onMoveX(outputEvent);
        }

        if (this.gesture.isSlideY && this.props.onMoveY) {
          this.props.onMoveY(outputEvent);
        }
      }
    }
  }

  /**
   * Обработчик событий touchend, touchcancel
   *
   * @param {Object} e Браузерное событие
   * @param {Object} props Component props
   * @returns {void}
   */
  onEnd = (e) => {
    const { isPressed, isSlide, isSlideX, isSlideY } = this.gesture;

    if (isPressed) {
      // Вызываем нужные колбеки из props
      const outputEvent = Object.assign({}, this.gesture, {
        originalEvent: e
      });

      if (this.props.onEnd) {
        this.props.onEnd(outputEvent);
      }

      if (isSlideY && this.props.onEndY) {
        this.props.onEndY(outputEvent);
      }

      if (isSlideX && this.props.onEndX) {
        this.props.onEndX(outputEvent);
      }
    }

    // Если закончили жест на ссылке, выставляем флаг для отмены перехода
    this.cancelClick = e.target.tagName === 'A' && isSlide;
    this.gesture = {};

    document.removeEventListener(events[1], this.onMove);
    document.removeEventListener(events[2], this.onEnd);
    document.removeEventListener(events[3], this.onEnd);
  }

  /**
   * Обработчик событий dragstart
   * Отменяет нативное браузерное поведение для вложенных ссылок и изображений
   *
   * @param {Object} e Браузерное событие
   * @returns {void}
   */
  onDragStart = (e) => {
    if (e.target.tagName === 'A' || e.target.tagName === 'IMG') {
      return e.preventDefault();
    } else return;
  }

  /**
   * Обработчик клика по компоненту
   * Отменяет переход по вложенной ссылке, если был зафиксирован свайп
   *
   * @param {Object} e Браузерное событие
   * @returns {void}
   */
  onClick = (e) => {
    if (this.cancelClick) {
      this.cancelClick = false;

      return e.preventDefault();
    }
  }

  getRef = (container) => {
    this.container = container;
    return;
  }

  render () {
    const handlers = {
      [events[0]]: this.onStart,
      onDragStart: this.onDragStart,
      onClick: this.onClick
    };
    const ComponentName = this.props.component;
    const nativeProps = removeObjectKeys(Object.assign({}, this.props), [
      'onStart',
      'onStartX',
      'onStartY',
      'onMove',
      'onMoveX',
      'onMoveY',
      'onEnd',
      'onEndX',
      'onEndY',
      'component'
    ]);

    return (
      <ComponentName {...handlers} {...nativeProps} ref={this.getRef}>
        {this.props.children}
      </ComponentName>
    );
  }
}