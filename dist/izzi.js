"use strict";

class izzi {
  allNodes = [];
  izziNodes = [];
  iCompNodes = [];

  constructor(izData, props) {
    this.izData = izData;

    if (props) {
      this.compName = props.compName;
      this.props = props.props;
      console.log(this.compName, this.props);
    }
  }

  loop = node => {
    var nodes = node.childNodes;

    for (var i = 0; i < nodes.length; i++) {
      if (!nodes[i]) {
        continue;
      }

      if (nodes[i].nodeName === "IZZI") {
        this.izziNodes.push(nodes[i]);
        continue;
      } else if (nodes[i].nodeName === "ICOMP") {
        this.iCompNodes.push(nodes[i]);
        continue;
      }

      if (nodes[i].childNodes.length > 0) {
        this.loop(nodes[i]);
      }

      this.allNodes.push({
        nodeName: nodes[i].nodeName,
        node: nodes[i]
      });
    }
  };

  parseVar(str) {
    var re = /\{\{(.*?)\}\}/g;
    var results = [];
    var match = re.exec(str);

    while (match != null) {
      results.push(match[1]);
      match = re.exec(str);
    }

    return results;
  }

  linkData = (template, vars, obj, tagType, attributeType = null) => {
    let isState, key;
    vars.map(v => {
      template = template.replaceAll(`{{${v}}}`, '${' + v + '}');
    });
    vars.map(v => {
      isState = new Function('props', `return ${v.substr(0, v.indexOf("."))}`)(this.props);

      if (isState?.type !== 'izziState') {
        isState = new Function('props', `return ${v}`)(this.props);
      }

      key = isState?.type === 'izziState' ? isState.id : v;

      if (v.substr(0, 6) === 'props.') {
        console.log(template);
        key = `${this.compName}.${v.substr(6)}`;
      }

      if (!this.izData.get(key)) this.izData.set(key, []);
      this.izData.get(key).push({
        element: obj,
        tagType: tagType,
        ...(attributeType && {
          attributeType: attributeType
        }),
        template: tagType === 'izziTag' ? new Function('props', 'return ()=>{return ' + template.trim() + '}')(this.props) : new Function('props', 'return ()=>{return `' + template + '`}')(this.props)
      });
    });
  };
  static escapeHTML = unsafe => {
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  };
  unEscapedHTML = elm => {
    let p = document.createElement('textarea');
    p.innerHTML = elm.innerHTML;
    window.a = p.defaultValue.trim();
    return p.defaultValue.trim();
  };
  initIzziTag = () => {
    let bindVars;
    this.izziNodes.map(iNode => {
      bindVars = iNode.getAttribute("bind")?.split(",");
      if (!bindVars) bindVars = [""];

      if (bindVars?.length) {
        this.linkData(this.unEscapedHTML(iNode), bindVars, iNode, "izziTag");
      }
    });
  };
  initMagicTag = () => {
    let vars;
    this.allNodes.map(nodeObj => {
      let n = nodeObj.node;

      if (n.data) {
        let template;
        template = n.data;
        template = template.replace(/\s+/g, ' ');
        vars = this.parseVar(template);

        if (vars.length) {
          this.linkData(template, vars, n, "magicTag");
        }
      }

      if (n.attributes) {
        for (let i = 0; i < n.attributes.length; i++) {
          let template, attributeType;
          template = n.attributes[i].value;
          template = template.replace(/\s+/g, ' ');
          attributeType = n.attributes[i].name;
          vars = this.parseVar(n.attributes[i].value);

          if (vars.length) {
            this.linkData(template, vars, n, "magicTagAttribute", attributeType);
          }
        }
      }
    });
  };
  getAllAttributes = el => el.getAttributeNames().reduce((obj, name) => ({ ...obj,
    [name]: el.getAttribute(name)
  }), {});
  initIcomp = () => {
    this.iCompNodes.map(iComp => {
      iComp.style.display = "none";
      let compName = iComp.getAttribute("name");
      let components = document.querySelectorAll(compName);
      [...components].map(x => {
        let children = {
          children: x.innerHTML
        };
        x.innerHTML = iComp.innerHTML;
        let props = { ...this.getAllAttributes(x),
          ...children
        };
        Object.keys(props).map(y => {
          let template = props[y].replace(/\s+/g, ' ');
          let vars = this.parseVar(template);
          this.linkData(template, vars, x, "magicProps");
        });
        init(x, {
          compName: compName,
          props: { ...this.getAllAttributes(x),
            ...children
          }
        });
      });
    });
  };
}

const setStateTostateMap = new Map();
const izData = new Map();

const useState = defaultValue => {
  let newState = {
    type: 'izziState',
    id: setStateTostateMap.size,
    state: defaultValue,
    set: newValue => {
      newState.state = newValue;
      render(newState.id);
    },
    get: () => {
      return newState.state;
    }
  };
  setStateTostateMap.set(setStateTostateMap.size, newState);
  return newState;
};

const renderHTML = izziKey => {
  izData.get(izziKey)?.map(izzi => {
    let izziTemplate = izzi.template();
    if (Array.isArray(izziTemplate)) izziTemplate = izziTemplate.join("");else if (typeof izziTemplate === "object") izziTemplate = JSON.stringify(izziTemplate);else izziTemplate = izziTemplate;

    if (izzi.tagType === "magicTag") {
      izzi.element.textContent = izziTemplate;
    } else if (izzi.tagType === 'izziTag') {
      izzi.element.innerHTML = izziTemplate;
    } else if (izzi.tagType === "magicTagAttribute") {
      izzi.attributeType === 'value' ? izzi.element.value = izziTemplate : izzi.element.setAttribute(izzi.attributeType, izziTemplate);
    }
  });
};

const render = (izziKey = null) => {
  if (izziKey === null) {
    [...izData.keys()].map(key => {
      renderHTML(key);
    });
  } else {
    renderHTML(izziKey);
  }
};

const init = async (elm, props) => {
  let z = new izzi(izData, props);
  window.z = z;
  z.loop(elm);
  z.initMagicTag();
  z.initIzziTag();
  z.initIcomp();
  render();
};