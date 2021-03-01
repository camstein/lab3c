var map = L.map('map').setView([47.2529, -122.4443], 12);
L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiY2FtZXJvbnN0ZWluZXIzMSIsImEiOiJja2szcWV3aG4wMXJmMndsaGV0Mm9qaDNrIn0.-HtiggKqG14xmsRD2uH2PQ', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox/streets-v11',
    tileSize: 512,
    zoomOffset: -1,
    accessToken: 'pk.eyJ1IjoiY2FtZXJvbnN0ZWluZXIzMSIsImEiOiJja2szcWV3aG4wMXJmMndsaGV0Mm9qaDNrIn0.-HtiggKqG14xmsRD2uH2PQ'
}).addTo(map);

var drawnItems = L.featureGroup().addTo(map);

var cartoData = L.layerGroup().addTo(map);
var url = "https://camstein.carto.com/api/v2/sql";
var urlGeoJSON = url + "?format=GeoJSON&q=";
var sqlQuery = "SELECT the_geom, input_name, input_like, input_beverage FROM lab_3c_cameron";
function addPopup(feature, layer) {
    layer.bindPopup(
        "<b>" + feature.properties.input_name + "</b><br>" +
        feature.properties.input_like + "</b><br>" +
        feature.properties.input_beverage
    );
}

fetch(urlGeoJSON + sqlQuery)
    .then(function(response) {
    return response.json();
    })
    .then(function(data) {
        L.geoJSON(data, {onEachFeature: addPopup}).addTo(cartoData);
    });

new L.Control.Draw({
    draw : {
        polygon : true,
        polyline : false,
        rectangle : false,     // Rectangles disabled
        circle : false,        // Circles disabled
        circlemarker : false,  // Circle markers disabled
        marker: true
    },
    edit : {
        featureGroup: drawnItems
    }
}).addTo(map);

map.addEventListener("draw:created", function(e) {
    e.layer.addTo(drawnItems);
    drawnItems.eachLayer(function(layer) {
        var geojson = JSON.stringify(layer.toGeoJSON().geometry);
        console.log(geojson);
    });
});

function createFormPopup() {
    var popupContent =
        '<form>' +
        '<br>Name of Establishment:<br><input type="text" id="input_name"><br><br>' +
        ' Do you like this Establishment:<br>' +
        '<input type="radio" id="input_yes" name="like" value="Yes">' +
          '<label for="yes">Yes</label><br>' +
        '<input type="radio" id="input_no" name="like" value="No">' +
          '<label for="no">No</label><br>' +
        '<br>Favorite Beverage:<br><input type="text" id="input_beverage"><br><br> ' +
        '<input type="button" value="Submit" id="submit">' +
        '</form>'
    drawnItems.bindPopup(popupContent).openPopup();
}

map.addEventListener("draw:created", function(e) {
    e.layer.addTo(drawnItems);
    createFormPopup();
});

function setData(e) {

    if(e.target && e.target.id == "submit") {

        // Get user name and description
        var enteredName = document.getElementById("input_name").value;
        var enteredYesNo = $('input[name="like"]:checked').val();
        var enteredBeverage = document.getElementById("input_beverage").value;

        // For each drawn layer
        drawnItems.eachLayer(function(layer) {

    			// Create SQL expression to insert layer
                var drawing = JSON.stringify(layer.toGeoJSON().geometry);
                var sql =
                    "INSERT INTO lab_3c_cameron (the_geom, input_name, input_like, input_beverage) " +
                    "VALUES (ST_SetSRID(ST_GeomFromGeoJSON('" +
                    drawing + "'), 4326), '" +
                    enteredName + "', '" +
                    enteredYesNo + "', '" +
                    enteredBeverage + "')";
                console.log(sql);

                // Send the data
                fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    body: "q=" + encodeURI(sql)
                })
                .then(function(response) {
                    return response.json();
                })
                .then(function(data) {
                    console.log("Data saved:", data);
                })
                .catch(function(error) {
                    console.log("Problem saving the data:", error);
                })

            // Transfer submitted drawing to the CARTO layer
            //so it persists on the map without you having to refresh the page
            var newData = layer.toGeoJSON();
            newData.properties.input_beverage = enteredBeverage;
            newData.properties.input_like = enteredYesNo;
            newData.properties.input_name = enteredName;
            L.geoJSON(newData, {onEachFeature: addPopup}).addTo(cartoData);

        });

        // Clear drawn items layer
        drawnItems.closePopup();
        drawnItems.clearLayers();

    }
}

document.addEventListener("click", setData);

map.addEventListener("draw:editstart", function(e) {
    drawnItems.closePopup();
});
map.addEventListener("draw:deletestart", function(e) {
    drawnItems.closePopup();
});
map.addEventListener("draw:editstop", function(e) {
    drawnItems.openPopup();
});
map.addEventListener("draw:deletestop", function(e) {
    if(drawnItems.getLayers().length > 0) {
        drawnItems.openPopup();
    }
});
