"use strict";

var Component = require('../../../ui/component');
var $$ = Component.$$;
var _ = require('../../../basics/helpers');

QUnit.uiModule('Substance.Component');

var TestComponent = Component.extend({
  didInitialize: function() {
    // make some methods inspectable
    this.didMount = sinon.spy(this, 'didMount');
    this.didRender = sinon.spy(this, 'didRender');
    this.willUnmount = sinon.spy(this, 'willUnmount');
    this.shouldRerender = sinon.spy(this, 'shouldRerender');
    this.render = sinon.spy(this, 'render');
  }
});

var SimpleComponent = TestComponent.extend({
  render: function() {
    var el = $$('div').addClass('simple-component');
    if (this.props.children) {
      el.append(this.props.children);
    }
    return el;
  }
});

QUnit.test("Every component should have a parent", function(assert) {
  assert.throws(function() {
    new Component();
  }, "Should throw an exception when no parent is given.");
});

QUnit.test("Throw error when render method is not returning an element", function(assert) {
  var MyComponent = TestComponent.extend({
    displayName: 'MyComponent',
    render: function() {}
  });
  assert.throws(function() {
    $$(MyComponent)._render();
  }, "Should throw an exception when render does not return an element");
});

QUnit.test("Different mount scenarios", function(assert) {
  // Mount to a detached element
  var el = $('<div>')[0];
  var comp = Component.mount($$(SimpleComponent), el);
  assert.equal(comp.didMount.callCount, 0, "didMount must not be called when mounting to detached elements");
  assert.equal(comp.didRender.callCount, 1, "didRender must have been called once");
  assert.ok(comp.$el);

  // Mount to an existing DOM element (this time we pass a jQuery element which is also supported)
  comp = Component.mount($$(SimpleComponent), $('#qunit-fixture'));
  assert.equal(comp.didMount.callCount, 1, "didMount must not be called when mounting to attached elements");
  assert.equal(comp.didRender.callCount, 1, "didRender must have been called once");
  assert.ok(comp.$el);  

  // Mount, passing a Component instance instead of a VirtualComponent
  comp = new SimpleComponent("root");
  Component.mount(comp, $('#qunit-fixture')[0]);
});

QUnit.test("Render an HTML element", function(assert) {
  var comp = $$('div')._render();
  assert.equal(comp.$el[0].tagName.toLowerCase(), 'div', 'Element should be a "div".');
  comp = $$('span')._render();
  assert.equal(comp.$el[0].tagName.toLowerCase(), 'span', 'Element should be a "span".');
});

QUnit.test("Render an element with attributes", function(assert) {
  var comp = $$('div').attr('data-id', 'foo')._render();
  assert.equal(comp.$el.attr('data-id'), 'foo', 'Element should be have data-id="foo".');
});

QUnit.test("Render an element with css styles", function(assert) {
  var comp = $$('div').css('width', 100)._render();
  assert.equal(comp.$el.css('width'), "100px", 'Element should have a css width of 100px.');
});

QUnit.test("Render an element with classes", function(assert) {
  var comp = $$('div').addClass('test')._render();
  assert.ok(comp.$el.hasClass('test'), 'Element should have class "test".');
});

QUnit.test("Render an element with custom html", function(assert) {
  var comp = $$('div').html('Hello <b>World</b>')._render();
  assert.equal(comp.$el.find('b').length, 1, 'Element should have rendered HTML as content.');
  assert.equal(comp.$el.find('b').text(), 'World','Rendered element should have right content.');
});


QUnit.test("Render a component", function(assert) {
  var comp = $$(SimpleComponent)._render();
  assert.equal(comp.$el[0].tagName.toLowerCase(), 'div', 'Element should be a "div".');
  assert.ok(comp.$el.hasClass('simple-component'), 'Element should have class "simple-component".');
});

QUnit.test("Render nested elements", function(assert) {
  var comp = $$('div').addClass('parent')
    .append($$('div').addClass('child1'))
    .append($$('div').addClass('child2'))
    ._render();
  assert.equal(comp.children.length, 2, 'Component should have two children.');
  assert.ok(comp.$el.hasClass('parent'), 'Element should have class "parent".');
  assert.ok(comp.children[0].$el.hasClass('child1'), 'First child should have class "child1".');
  assert.ok(comp.children[1].$el.hasClass('child2'), 'Second child should have class "child2".');
});

QUnit.test("Render a component with children", function(assert) {
  // Note: in case of custom components you should provide children via
  // props, instead of using append. The render method of the custom
  // needs to take care of 'placing' the children.
  var comp = $$(SimpleComponent, {
    children: [
      $$('div').addClass('child1'),
      $$('div').addClass('child2')
    ]
  })._render();
  assert.equal(comp.children.length, 2, 'Component should have two children.');
  assert.ok(comp.children[0].$el.hasClass('child1'), 'First child should have class "child1".');
  assert.ok(comp.children[1].$el.hasClass('child2'), 'Second child should have class "child2".');
});

QUnit.test("Render a child with key", function(assert) {
  var comp = $$('div').addClass('parent')
    .append($$('div').addClass('child').key('foo'))
    ._render();
  assert.ok(comp.refs.foo, 'Component should have a ref "foo".');
  assert.ok(comp.refs.foo.$el.hasClass('child'), 'Referenced component should have class "child".');
});

/** Differential rerendering **/

QUnit.test("Preserve a child with key", function(assert) {
  var virtualDom = $$('div').append($$(SimpleComponent).key('foo'));
  var comp = Component._render(virtualDom);
  var child = comp.refs.foo;
  var el = child.$el[0];
  // rerender using the same virtual dom
  comp._render(_.deepclone(virtualDom));
  assert.ok(comp.refs.foo === child, 'Child component should have been preserved.');
  assert.ok(comp.refs.foo.$el[0] === el, 'Child element should have been preserved.');
});

QUnit.test("Wipe a child without key", function(assert) {
  var virtualDom = $$('div').append($$(SimpleComponent));
  var comp = Component._render(virtualDom);
  var child = comp.children[0];
  var el = child.$el[0];
  // rerender using the same virtual dom
  comp._render(_.deepclone(virtualDom));
  // as we did not apply a key, the component simply gets rerendered from scratch
  assert.ok(comp.children[0] !== child, 'Child component should have been preserved.');
  assert.ok(comp.children[0].$el[0] !== el, 'Child element should have been preserved.');
});

QUnit.test("Don't do a deep rerender when only attributes/classes/styles change.", function(assert) {
  var comp = Component._render($$('div')
    .attr('data-foo', 'bar')
    .addClass('foo')
    .css('width', 100)
    .append($$(SimpleComponent)));
  var render = sinon.spy(comp, 'render');
  // rerender with changed attributes, classes and css styles
  comp._render($$('div')
    .attr('data-foo', 'baz')
    .addClass('bar')
    .css('width', 200)
    .append($$(SimpleComponent)));
  assert.equal(comp.$el.attr('data-foo'), 'baz', 'Data attribute should be up-to-date.');
  assert.ok(!comp.$el.hasClass('foo') && comp.$el.hasClass('bar'), 'Element classes should be up-to-date.');
  assert.equal(comp.$el.css('width'), "200px", "Element style should be up-to-date.");
  assert.equal(render.callCount, 0, "Component should not have been rerendered.");
});

QUnit.test("Do deep rerender when properties have changed.", function(assert) {
  var comp = Component._render($$(SimpleComponent, { foo: 'bar '}));
  // rerender with changed attributes
  comp.setProps({ foo: 'baz' });
  assert.equal(comp.shouldRerender.callCount, 1, "Component should have been asked whether to rerender.");
  assert.equal(comp.render.callCount, 2, "Component should have been rerendered.");
});

QUnit.test("Do deep rerender when state has changed.", function(assert) {
  var comp = Component._render($$(SimpleComponent));
  // rerender with changed attributes
  comp.setState({ foo: 'baz' });
  assert.equal(comp.shouldRerender.callCount, 1, "Component should have been asked whether to rerender.");
  assert.equal(comp.render.callCount, 2, "Component should have been rerendered.");
});

QUnit.test("Only call didMount once for childs and grandchilds when setProps is called during mounting process.", function(assert) {
  var Child = TestComponent.extend({
    render: function() {
      if (this.props.loading) {
        return $$('div').append('Loading...');
      } else {
        return $$('div').append(
          $$(SimpleComponent).key('child')
        );
      }
    },
  });
  var Parent = TestComponent.extend({
    render: function() {
      return $$('div')
        .append($$(Child).key('child').setProps({ loading: true}));
    },
    didMount: function() {
      this.refs.child.setProps({ loading: false });
    }
  });
  
  var comp = Component.mount($$(Parent), $('#qunit-fixture'));
  var childComp = comp.refs.child;
  var grandChildComp = childComp.refs.child;
  assert.equal(childComp.didMount.callCount, 1, "Child's didMount should have been called only once.");
  assert.equal(grandChildComp.didMount.callCount, 1, "Grandchild's didMount should have been called only once.");
  
  comp.empty();
  assert.equal(childComp.willUnmount.callCount, 1, "Child's willUnmount should have been called once.");
  assert.equal(grandChildComp.willUnmount.callCount, 1, "Grandchild's willUnmount should have been called once.");
});

// TODO: The next test case covers most of this, so maybe we can remove it in the future
QUnit.test("Propagate properties to child components when setProps called on parent", function(assert) {
  var ItemComponent = TestComponent.extend({
    render: function() {
      return $$('div').append(this.props.name);
    }
  });

  var CompositeComponent = TestComponent.extend({
    render: function() {
      var el = $$('div').addClass('composite-component');
      this.props.items.forEach(function(item) {
        el.append($$(ItemComponent, item));
      });
      return el;
    }
  });

  var comp = $$(CompositeComponent, {
    items: [
      {name: 'A'},
      {name: 'B'}
    ]
  })._render();

  assert.equal(comp.children.length, 2, 'Component should have two children.');
  assert.equal(comp.children[0].$el.text(), 'A', 'First child should have text A');
  assert.equal(comp.children[1].$el.text(), 'B', 'First child should have text B');

  // Now we are gonna set new props
  comp.setProps({
    items: [
      {name: 'X'},
      {name: 'Y'}
    ]
  });

  assert.equal(comp.children.length, 2, 'Component should have two children.');
  assert.equal(comp.children[0].$el.text(), 'X', 'First child should have text X');
  assert.equal(comp.children[1].$el.text(), 'Y', 'First child should have text Y');
});


QUnit.test("Preserve components when key matches, and rerender when props changed", function(assert) {
  var ItemComponent = TestComponent.extend({
    shouldRerender: function(nextProps) {
      return !_.isEqual(nextProps, this.props);
    },
    render: function() {
      return $$('div').append(this.props.name);
    }
  });

  var CompositeComponent = TestComponent.extend({
    render: function() {
      var el = $$('div').addClass('composite-component');
      this.props.items.forEach(function(item) {
        el.append($$(ItemComponent, item).key(item.key));
      });
      return el;
    }
  });

  // Initial mount
  var comp = Component.mount($$(CompositeComponent, {
    items: [
      {key: 'a', name: 'A'},
      {key: 'b', name: 'B'},
      {key: 'c', name: 'C'}
    ]
  }), $('#qunit-fixture'));

  var a = comp.refs.a;
  var b = comp.refs.b;
  var c = comp.refs.c;
  var aEl = a.$el[0];
  var bEl = b.$el[0];

  assert.equal(comp.children.length, 3, 'Component should have three children.');
  assert.equal(comp.children[0].$el.text(), 'A', 'First child should have text A');
  assert.equal(comp.children[1].$el.text(), 'B', 'First child should have text B');
  assert.equal(comp.children[2].$el.text(), 'C', 'First child should have text C');

  // Props update that preserves some of our components, drops some others
  // and adds some new
  comp.setProps({
    items: [
      {key: 'a', name: 'X'}, // preserved (props changed)
      {key: 'd', name: 'Y'}, // new
      {key: 'b', name: 'B'}, // preserved (same props)
      {key: 'e', name: 'Z'}  // new
    ]
  });

  // a and b should have been preserved
  assert.equal(a, comp.children[0], 'a should be the same instance');
  assert.equal(b, comp.children[2], 'b should be the same component instance');  

  // c should be gone
  assert.equal(c.willUnmount.callCount, 1, 'c should have been unmounted');

  // a should have been rerendered (different props) while b should not (same props)
  assert.equal(a.render.callCount, 2, 'Component with key a should have been rendered twice');
  assert.equal(b.render.callCount, 1, 'Component with key b should have been rendered once');

  assert.equal(comp.children.length, 4, 'Component should have 4 children.');
  assert.equal(comp.children[0].$el.text(), 'X', 'First child should have text X');
  assert.equal(comp.children[1].$el.text(), 'Y', 'First child should have text Y');
  assert.equal(comp.children[2].$el.text(), 'B', 'First child should have text Y');
  assert.equal(comp.children[3].$el.text(), 'Z', 'First child should have text Z');

  // Actually I don't have the full understanding yet, why aEl is the same after rerender.
  // It means that the rerender is smart enough to reuse the element. What if the tag had changed?
  assert.equal(aEl, comp.children[0].$el[0], 'DOM element for a should be the same after rerender');
  assert.equal(bEl, comp.children[2].$el[0], 'DOM element for b should be the same, since there was no rerender');
});

