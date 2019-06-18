const CleanCSS = require('clean-css')
const fs = require('fs')

const promiseToGetMinifiedCss = () => {
  return new Promise((resolve, reject) => {
    fs.readFile('node_modules/mapbox-gl/dist/mapbox-gl.css', 'utf8', (err, css) => {
      if (err) return reject(err)
      const minified = new CleanCSS({}).minify(css)
      return resolve(minified.styles)
    })
  })
}

const promiseToGetCleanupJs = () => {
  return new Promise((resolve, reject) => {
    fs.readFile('node_modules/mapbox-gl/dist/mapbox-gl.js', 'utf8', (err, js) => {
      if (err) return reject(err)
      js = js.replace('this', 'window')
      js = js.replace('//# sourceMappingURL=mapbox-gl.js.map', '')
      return resolve(js)
    })
  })
}

const promiseToCreatePolymerCompatibleMapbox = () => {
  return new Promise(async (resolve, reject) => {
    const css = await promiseToGetMinifiedCss()
    const js = await promiseToGetCleanupJs()
    let newFileString = `const $_documentContainer = document.createElement('template');
      $_documentContainer.innerHTML = \`<dom-module id="mapboxgl-styles"><template><style>${css}</style></template></dom-module>\`;
      document.head.appendChild($_documentContainer.content);
      ${js}`
    fs.writeFile('node_modules/mapbox-gl/dist/mapbox-gl-polymer.js', newFileString, 'utf8', err => {
      if (err) return reject(err)
      console.log('mapbox-gl postinstall step performed succesfully')
      return resolve()
    })
  })
}

(async () => {
  await promiseToCreatePolymerCompatibleMapbox()
})()
