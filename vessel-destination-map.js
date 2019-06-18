import { LitElement, html, css } from 'lit-element'
import 'mapbox-gl/dist/mapbox-gl-polymer'

class VesselDestinationMap extends LitElement {
  static get styles() {
    return css`
      :host {
        display: flex;
      }
      #map {
        flex-grow: 1;
      }
    `
  }

  render() {
    return html`
      <div id="map"></div>
    `
  }

  static get properties() {
    return {
      imo: {
        type: Number,
        reflect: true
      },
      vessel: {
        type: Object
      },
      latitude: {
        type: Number,
        reflect: true
      },
      longitude: {
        type: Number,
        reflect: true
      },
      _map: {
        type: Object
      }
    }
  }

  firstUpdated() {
    mapboxgl.accessToken = window.mapboxKey
    const mapOptions = {
      container: this.shadowRoot.getElementById('map'),
      style: 'mapbox://styles/mapbox/light-v9?optimize=true',
      trackResize: true,
      zoom: 1
    }
    this._map = new mapboxgl.Map(mapOptions)
    this._addSources(this._map)
  }

  _display({ source, geoJson }) {
    this._map.on('load', () => {
      this._map.getSource(source).setData(geoJson)
    })
  }

  _displayDestinationFromProperties(properties) {
    if (!properties.has('latitude') || !properties.has('longitude')) return
    if (isNaN(this.longitude) || isNaN(this.latitude)) return
    this._display({
      source: 'destination',
      geoJson: this._buildPointGeoJson([ this.longitude, this.latitude ])
    })
  }

  updated(changedProperties) {
    this._displayDestinationFromProperties(changedProperties)
    this._updateVesselFromProperties(changedProperties)
    this._updateRouteFromProperties(changedProperties)
  }

  _updateRouteFromProperties(properties) {
    if ((!properties.has('latitude') || !properties.has('longitude')) && !properties.has('vessel')) return
    this._fetchRouteFromVesselToDestination()
  }

  _updateVesselFromProperties(properties) {
    if (!properties.has('imo')) return
    this._fetchVessel(this.imo)
  }

  _fetchRouteFromVesselToDestination() {
    const { imo, latitude, longitude, vessel } = this
    if (!vessel || isNaN(longitude) || isNaN(latitude)) return
    if (!imo || vessel.imo !== imo) return
    this._fetchRoute(vessel.coordinates, [ longitude, latitude ])
  }

  _fetchRoute([ fromLongitude, fromLatitude ], [ toLongitude, toLatitude ]) {
    fetch('https://api.searoutes.com/v2/route'
        + `?fromLon=${fromLongitude}&fromLat=${fromLatitude}`
        + `&toLon=${toLongitude}&toLat=${toLatitude}`, {
      headers: {
        'x-api-key': window.xApiKey,
        'Response-Type': 'application/geo+json'
      }
    })
    .then(res => res.json())
    .then(geoJson => {
      this._display({ source: 'route', geoJson })
    })
  }

  _fetchVessel(imo) {
    if (!imo) return
    fetch(`https://api.searoutes.com/vs/vessel-positions?imos=${imo}`, {
      headers: {
        'x-api-key': window.xApiKey,
        'Content-Type': 'application/json'
      }
    })
    .then(res => res.json())
    .then(res => {
      if (!res.vessels) return
      const { aisStatic, aisPosition } = res.vessels[0]
      if (isNaN(aisPosition.lon) || isNaN(aisPosition.lat)) return
      this.vessel = {
        coordinates: [ aisPosition.lon, aisPosition.lat ],
        imo: aisStatic.imo,
        name: aisStatic.name
      }
      this._display({
        source: 'vessel',
        geoJson: this._buildPointGeoJson(this.vessel.coordinates)
      })
    })
  }

  _buildPointGeoJson(coordinates) {
    return {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": coordinates
      }
    }
  }

  _addSources(map) {
    map.on('load', () => {
      map.addSource('destination', {
        "type": "geojson",
        "data": {
          "type": "FeatureCollection",
          "features": [],
        }
      })

      map.addLayer({
        "id": "destination",
        "type": "symbol",
        "source": "destination",
        "layout": {
          "icon-image": "harbor-15"
        }
      })

      map.addSource('vessel', {
        "type": "geojson",
        "data": {
          "type": "FeatureCollection",
          "features": [],
        }
      })

      map.addLayer({
        "id": "vessel",
        "type": "symbol",
        "source": "vessel",
        "layout": {
          "icon-image": "ferry-15"
        }
      })

      map.addSource('route', {
        "type": "geojson",
        "data": {
          "type": "FeatureCollection",
          "features": [],
        }
      })

      map.addLayer({
        "id": "route",
        "source": "route",
        "type": "line",
        "paint": {
          'line-width': 3,
          'line-color': 'blue'
        }
      })
    })
  }

}

window.customElements.define('vessel-destination-map', VesselDestinationMap);
