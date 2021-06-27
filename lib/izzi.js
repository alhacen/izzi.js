"use strict";
var allNodes=[]
const objToRendererMap = new Map()

const varToAttributesMap = new Map()
const varToObjectMap = new Map()

const AttributesToObjectMap = new Map()

const setStateTostateMap = new Map()
const stateToObjectMap = new Map()

const magicTagToscriptMap = new Map();
const stateToMagicTagMap = new Map();
const varToMagicTagMap = new Map();

const stateToAttributeMap = new Map()
const escapeHTML = (unsafeText) =>{
    let div = document.createElement('div');
    div.innerText = unsafeText;
    return div.innerHTML;
}
function escapeHTMLWrapper(unsafeText) {
    var re = /\${(.*?)\}/g;
    var results = []
    var match = re.exec(unsafeText);
    while (match != null) {
        results.push(match[1])
        match = re.exec(unsafeText);
    }
    results.map(r=>{
        unsafeText = unsafeText.replaceAll(`\${${r}}`,'${escapeHTML('+r+')}')
        // console.log(unsafeText)
    })
    return unsafeText

}
const inputToEvetntMap = new Map();
const loop = (node) => {
    // do some thing with the node here
    var nodes = node.childNodes;    
    for (var i = 0; i <nodes.length; i++){
        if(!nodes[i]){
            continue;
        }
        if(nodes[i].nodeName === "IZZI")
            continue
        if(nodes[i].nodeName === "INPUT"){
            let iEvent = nodes[i].getAttribute("iChange")
            if(iEvent){                
                if(!inputToEvetntMap.get(nodes[i]))
                    inputToEvetntMap.set(nodes[i],[])
                inputToEvetntMap.get(nodes[i]).push(iEvent)
            }
        }
        if(nodes[i].childNodes.length > 0){
            loop(nodes[i]);
        }
        allNodes.push(nodes[i])
    }
}
function parseVar(str) {
  var re = /\{\{(.*?)\}\}/g;

  var results = []
  var match = re.exec(str);
  while (match != null) {
    // matched text: match[0]
    // match start: match.index
    // capturing group n: match[n]
    results.push(match[1])
    match = re.exec(str);
  }
//   console.log(results)
  return results
}
const initAttributes = () =>{
    let vars;
    let attributeValue
    allNodes.map(n=>{
        if(n.attributes){
            for(let i=0;i< n.attributes.length; i++){
                attributeValue = n.attributes[i].value
                vars = parseVar(n.attributes[i].value)
                
                if(vars.length){
                    vars.map(v=>{
                        let state = new Function(`return ${v.substr(0,v.indexOf("."))}`)()
                        attributeValue = attributeValue.replaceAll(`{{${v}}}`,'${'+v+'}')

                        if(!stateToAttributeMap.get(state?.id)?.includes(n) && !varToAttributesMap.get(v)?.includes(n)){
                            if(state?.type === "state"){
                                if(!stateToAttributeMap.get(state.id))
                                    stateToAttributeMap.set(state.id, [])
    
                                stateToAttributeMap.get(state.id).push({
                                    object: n,
                                    attribute: n.attributes[i].name,
                                    renderer: new Function('return ()=>{return `' + attributeValue + '`}')()
                                })
                            }else{
                                if(!varToAttributesMap.get(v))
                                varToAttributesMap.set(v, [])
    
                                varToAttributesMap.get(v).push({
                                    object: n,
                                    attribute: n.attributes[i].name,
                                    renderer: new Function('return ()=>{return `' + attributeValue + '`}')()
                                })
                            }
                        }
                    })
                }
            }
        }
    })
}
const initInnerText = () =>{
        let vars;
        let innerText;
        allNodes.map(n=>{
            if(n.data){
                innerText = n.data
                innerText = innerText.replace(/\s+/g, ' ')
                vars = parseVar(innerText)
                if(vars.length){
                    vars.map(v=>{
                        let state = new Function(`return ${v.substr(0,v.indexOf("."))}`)()
                        
                        if(!stateToObjectMap.get(state?.id)?.includes(n) && !varToObjectMap.get(v)?.includes(n)){
                            if(state?.type==="state"){
                                if(!stateToObjectMap.get(state.id))
                                    stateToObjectMap.set(state.id,[])
                                stateToObjectMap.get(state.id).push(n)

                            }else{
                                if(!varToObjectMap.get(v))
                                    varToObjectMap.set(v, [])
                                varToObjectMap.get(v).push(n)
                            }

                            
                        }
                        innerText = innerText.replaceAll(`{{${v}}}`,'${'+v+'}')
                    })
                    window.y=innerText
                    objToRendererMap.set(n,new Function('return { render :()=>{return `' + innerText + '`}}')());
                }
            }
        })

}
const render = () =>{
    [...objToRendererMap.keys()].map(elm=>{
        elm.data = objToRendererMap.get(elm).render()
    });
    [...stateToAttributeMap.values()].map(obj=>{
        obj.map(elm=>{
            elm.attribute==="value"?elm.object.value = elm.renderer():elm.object.setAttribute(elm.attribute, elm.renderer())
        })
    });
    [...varToAttributesMap.values()].map(obj=>{
        obj.map(elm=>{
            elm.attribute==="value"?elm.object.value = elm.renderer():elm.object.setAttribute(elm.attribute, elm.renderer())

        })
    })
}
const reRender = (stateId) =>{
    stateToObjectMap.get(stateId)?.map(elm=>{
        elm.data =  objToRendererMap.get(elm).render()
    })
    stateToAttributeMap.get(stateId)?.map(elm=>{
        console.log(elm)
        elm.attribute==="value"?elm.object.value = elm.renderer():elm.object.setAttribute(elm.attribute, elm.renderer())

    });
    stateToMagicTagMap.get(stateId)?.map(elm=>{
        let izziReturn;
        izziReturn = magicTagToscriptMap.get(elm)
        console.log(escapeHTMLWrapper(`return ${izziReturn.replaceAll("&gt;",">").replaceAll("&lt;","<").trim()}`))
        izziReturn = new Function(escapeHTMLWrapper(`return ${izziReturn.replaceAll("&gt;",">").replaceAll("&lt;","<").trim()}`))();
        console.log(izziReturn)
        // console.log(`return \`${izziCodeTemplate.replaceAll("&gt;",">").replaceAll("&lt;","<").trim()}\``)
        if(izziReturn){
            if(Array.isArray(izziReturn))
                elm.innerHTML=izziReturn.join("")
            else if(typeof(izziReturn) === "object")
                elm.innerHTML = JSON.stringify(izziReturn)
            else
                elm.innerHTML = escapeHTMLWrapper(izziReturn)
        }else{
            elm.innerHTML=""
        }
    })
}
const useState = (defaultValue) =>{
    let newState = {
        type:'state',
        id: setStateTostateMap.size,
        state: defaultValue,
        set: (newValue) =>{
            newState.state = newValue;
            reRender(newState.id)
        },
        get: ()=>{
            return newState.state
        }
    }
    setStateTostateMap.set(setStateTostateMap.size, newState)
    return newState;
}

const initMagicTag = () =>{
    let allIzzis = document.getElementsByTagName("IZZI")
    let vars;
    let izziCodeTemplate;
    let izziReturn;
    for(let i=0; i<allIzzis.length;i++){
        izziCodeTemplate = allIzzis[i].innerHTML
        vars = parseVar(izziCodeTemplate)
        if(vars.length){
            vars.map(v=>{
                let state = new Function(`return ${v.substr(0,v.indexOf("."))}`)()
                if(!stateToMagicTagMap.get(state?.id)?.includes(allIzzis[i]) && !varToMagicTagMap.get(v)?.includes(allIzzis[i])){
                    if(state?.type==="state"){
                        if(!stateToMagicTagMap.get(state.id))
                            stateToMagicTagMap.set(state.id,[])
                        stateToMagicTagMap.get(state.id).push(allIzzis[i])

                    }else{
                        if(!varToMagicTagMap.get(v))
                            varToMagicTagMap.set(v, [])
                        varToMagicTagMap.get(v).push(allIzzis[i])
                    }
                }
                izziCodeTemplate = izziCodeTemplate.replaceAll(`{{${v}}}`,v)
            })
        }
        izziCodeTemplate = izziCodeTemplate.replaceAll("&gt;",">").replaceAll("&lt;","<").trim()
        magicTagToscriptMap.set(allIzzis[i],izziCodeTemplate);
        izziReturn = new Function(`return ${izziCodeTemplate}`)();
        console.log(`return ${izziCodeTemplate.replaceAll("&gt;",">").replaceAll("&lt;","<").trim()}`)
        // console.log(`return \`${izziCodeTemplate.replaceAll("&gt;",">").replaceAll("&lt;","<").trim()}\``)
        if(izziReturn){
            if(Array.isArray(izziReturn))
                allIzzis[i].innerHTML=izziReturn.join("")
            else if(typeof(izziReturn) === "object")
                allIzzis[i].innerHTML = JSON.stringify(izziReturn)
            else
                allIzzis[i].innerHTML=izziReturn
        }else{
            allIzzis[i].innerHTML=""
        }
    }
}
const init = async (id) =>{
    loop(document.getElementById(id));
    initAttributes()
    initInnerText()
    initMagicTag()
    render()
}