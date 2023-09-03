const boundLatitude = 0.004500/2; // horizontal
const boundLongitude = 0.008500/2; // vertical (h, v)
let mapObject,
    geoObject,
    geoObjectCoordinates,
    geoObjectSearchBounds,
    searchCategories,
    searchControl,
    searchResults;
let searchButton = document.getElementById("searchButton");
let searchAddress = document.getElementById("searchAddress");
let parseCount = document.getElementById("parseCount");
let parseOutput = document.getElementById("parseOutput");
let parseStatus = document.getElementById("parseStatus");
let terminalScroll = document.getElementById("terminalScroll");

function init() {
    terminalOutput("Инициализация.");
    // suggestions on search field
    let searchAddressSuggestView = new ymaps.SuggestView("searchAddress");
    // run geocode on click event
    searchButton.onclick = () => geocode();
}

function geocode() {
    terminalOutput("Геокодируем адрес в координаты, получаем границы объекта поиска.");
    // value from html form
    let searchAddressValue = searchAddress.value;
    // geocoding object of search
    ymaps.geocode(searchAddressValue).then(function (res) {
        // getting object from geocoder
        geoObject = res.geoObjects.get(0);
        let error;
        if (geoObject) {
            switch (geoObject.properties.get("metaDataProperty.GeocoderMetaData.precision")) {
                case "exact":
                    break;
                case "number":
                case "near":
                case "range":
                case "street":
                    error = "Неполный адрес, уточните номер дома";
                    break;
                case "other":
                default:
                    error = "Неточный адрес, уточните адрес";
            }
        } else {
            error = "Адрес не найден, уточните адрес";
        }

        if (error) {
            terminalOutput(error);
        } else {
            // setting icon for map
            geoObject.options.set("preset", "islands#blueHomeCircleIcon");
            // getting bounds and coordinates
            let geoObjectBounds = geoObject.properties.get("boundedBy");
            geoObjectCoordinates = geoObject.geometry.getCoordinates();
            geoObjectSearchBounds = [
                // [(geoObjectBounds[0][0]-boundLatitude),(geoObjectBounds[0][1]-boundLongitude)],
                // [(geoObjectBounds[1][0]+boundLatitude),(geoObjectBounds[1][1]+boundLongitude)]
                [(geoObjectCoordinates[0] - boundLatitude), (geoObjectCoordinates[1] - boundLongitude)],
                [(geoObjectCoordinates[0] + boundLatitude), (geoObjectCoordinates[1] + boundLongitude)]
            ];
            console.log(geoObjectSearchBounds);
            // map settings
            let mapState = {
                center: geoObjectCoordinates,
                zoom: 12,
                controls: []
                //controls: ['zoomControl'],
            };
            let searchControlParams = {
                options: {
                    provider: "yandex#search",
                    noPopup: true,
                    noSuggestPanel: true,
                    results: 100,
                    boundedBy: geoObjectSearchBounds
                }
            };
            createMap(mapState, searchControlParams);
        }
    });
}

/**
 * Creating yandex.map object
 * @param {object} state map settings
 * @param {object} searchParams search settings
 * @param {bool} recreate recreate map
 * @param {object} parseResults if 'recreate' param is true, this param is required
 */
function createMap(state, searchParams, recreate = false, parseResults = null) {
    // destroying map
    if (mapObject && recreate) {
        terminalOutput("Удаляем старую карту.");
        mapObject.destroy();
        mapObject = null;
    }
    // if map object is not created
    if (!mapObject) {
        terminalOutput("Создаем карту, отображаем объект в виде иконки и границы.");
        // creating map
        mapObject = new ymaps.Map("map", state, {
            restrictMapArea: true
        });
        if (!recreate) {
            // add searchControl for searching process
            searchControl = new ymaps.control.SearchControl(searchParams);
            mapObject.controls.add(searchControl);
        }
        // creating rectangle from bounds positions
        let rectangle = new ymaps.Rectangle(geoObjectSearchBounds, {}, {
            fillColor: "#ff0000",
            fillOpacity: 0.2,
            strokeColor: "#ff0000",
            strokeOpacity: 0.3,
            strokeWidth: 2,
            borderRadius: 3
        });
        // adding graphics on map
        //mapObject.geoObjects
        mapObject.geoObjects.add(geoObject); // dot on object
        mapObject.geoObjects.add(rectangle); // rectangle of search object

        if (recreate && parseResults) {
            showIcons(parseResults);
        }
    }
    if (!recreate) {
        parseMap();
    }
    mapObject.setBounds(geoObjectSearchBounds);
}

async function parseMap() {
    terminalOutput("Ищем новые объекты рядом с объектом поиска. Подождите...");
    searchCategories = [
        [
            "Государственные лечебные учреждения",
            "islands#blueMedicalCircleIcon",
        ],
        [
            "Аптеки",
            "islands#blueMedicalCircleIcon",
        ],
        [
            "Детские сады",
            "islands#blueFamilyCircleIcon",
        ],
        [
            "Общеобразовательные школы, лицеи",
            "islands#blueEducationCircleIcon",
        ],
        [
            "Развивающие центры",
            "islands#blueEducationCircleIcon",
        ],
        [
            "Среднее специальное образование",
            "islands#blueEducationCircleIcon",
        ],
        [
            "Высшее образование",
            "islands#blueEducationCircleIcon",
        ],
        [
            "Дополнительное образование",
            "islands#blueEducationCircleIcon",
        ],
        [
            "Научные организации",
            "islands#blueScienceCircleIcon",
        ],
        [
            "Библиотека",
            "islands#blueBookCircleIcon",
        ],
        [
            "Магазин",
            "islands#blueShoppingCircleIcon",
        ],
        [
            "Торговые центры",
            "islands#blueShoppingCircleIcon",
        ],
        [
            "Продукты питания",
            "islands#blueShoppingCircleIcon",
        ],
        [
            "Универсальные магазины",
            "islands#blueShoppingCircleIcon",
        ],
        [
            "Кафе, ресторан, столовая",
            "islands#blueFoodCircleIcon",
        ],
        [
            "Детская площадка",
            "islands#blueFamilyCircleIcon",
        ],
        [
            "Спортплощадка",
            "islands#blueSportCircleIcon",
        ],
        [
            "Собачья площадка",
            "islands#blueDogCircleIcon",
        ],
        [
            "Остановка общественного транспорта",
            "islands#blueMassTransitCircleIcon"
        ]
    ];
    //console.log(searchCategories);
    let parseResults = new Object();
    let parseResultsSearchObjects = new Object();

    for (let i = 0; i < searchCategories.length; i++) {
        await search(i);
        if (searchResults.length > 0) {
            let idObj = 0;
            // main parser object 
            parseResults[i] = {
                categoryName: searchCategories[i][0],
                categoryIcon: searchCategories[i][1],
                objects: {}
            }
            // reset previous results
            parseResultsSearchObjects = [];
            // console.log('parse_search_object>', searchResults);
            // console.log('parse_category>', searchCategories[i][0]);
            for (let j = 0; j < searchResults.length; j++) {
                let searchObjectCoordinates = searchResults[j].geometry._coordinates;
                // console.log('parse_loop>', j);
                if (geoObjectSearchBounds[0][0] <= searchObjectCoordinates[0] &&
                    searchObjectCoordinates[0] <= geoObjectSearchBounds[1][0] &&
                    geoObjectSearchBounds[0][1] <= searchObjectCoordinates[1] &&
                    searchObjectCoordinates[1] <= geoObjectSearchBounds[1][1]) {
                    // console.log('parse_object_id>', idObj);
                    // console.log('parse_object_name>', searchResults[j].properties._data.name);
                    parseResults[i].objects = Object.assign(parseResultsSearchObjects, {
                        [idObj]: {
                            objCategory: searchResults[j].properties._data.categoriesText,
                            objName: searchResults[j].properties._data.name,
                            objAddress: searchResults[j].properties._data.address,
                            objCoordinates: searchResults[j].geometry._coordinates,
                        }
                    });
                    ++idObj;
                } else {
                    //console.log('parse_object_name_garbage>', searchResults[j].properties._data.name);
                }
                continue;
            }
        }
        continue;
    }
    console.log("parseResult>", parseResults);
    showResults(parseResults);
}

/**
 * Searching infrastructure objects 
 * @param {number} idCategories index of categories for search
 */
async function search(idCategories) {
    let searchCategoriesValue = searchCategories[idCategories][0];
    let term = "> Поиск по категории: " + searchCategoriesValue;
    terminalOutput(term)
    await searchControl.search(searchCategoriesValue).then(function () {
        searchResults = searchControl.getResultsArray();
        // console.log(searchResults);
    });
}

function showResults(parseResults) {
    terminalOutput("Оформляем результат...");

    let parseResultsLength = Object.keys(parseResults).length;

    let mapState = {
        center: geoObjectCoordinates,
        zoom: 14,
        controls: []
        //controls: ['zoomControl'],
    };
    let searchControlParams = {};
    createMap(mapState, searchControlParams, true, parseResults);

    let resultToHtml = "", parseResultsEntryLength = 0;
    for (let i = 0; i < parseResultsLength; i++) {
        let parseEntry = parseResults[i];
        let parseObjectsEntryLength = Object.keys(parseEntry.objects).length;
        let parseObjectEntryName = parseEntry.categoryName;
        resultToHtml += [i + 1, ") ", parseObjectEntryName, "<br>"].join("");
        parseResultsEntryLength += parseObjectsEntryLength;
        if (parseObjectsEntryLength > 0) {
            for (let j = 0; j < parseObjectsEntryLength; j++) {
                resultToHtml += [i + 1, ".", j + 1, ") ", parseEntry.objects[j].objCategory, " - ", parseEntry.objects[j].objName, "<br>"].join("");
                resultToHtml += [parseEntry.objects[j].objAddress, " (", parseEntry.objects[j].objCoordinates, ")", "<br><br>"].join("");
            }
        } else {
            resultToHtml += "Результаты отсутствуют <br><br>";
        }
    }
    terminalOutput("Готово.");
    searchButton.onclick = () => {
        terminalOutput("Перезагрузите страницу и введите новый запрос.");
        mapObject.setBounds(geoObjectSearchBounds);
    }
    parseCount.innerHTML = parseResultsEntryLength;
    parseOutput.innerHTML = resultToHtml;
}

function terminalOutput(message) {
    parseStatus.innerHTML += message + "<br>";
    terminalScroll.scrollTop = 9999;
}

function showIcons(parseResults) {
    terminalOutput("!!!Отображаем объекты с парсера.");
            console.log(parseResults);
            let parseResultsLength = Object.keys(parseResults).length;
            for (let i = 0; i < parseResultsLength; i++) {
                let parseEntry = parseResults[i];
                let parseObjectsEntryLength = Object.keys(parseEntry.objects).length;            
                let parseGeoObjects = new ymaps.GeoObjectCollection({}, {
                    preset: parseEntry.categoryIcon,
                });
                for (let j = 0; j < parseObjectsEntryLength; j++) {
                    parseGeoObjects.add(new ymaps.Placemark(parseEntry.objects[j].objCoordinates, {
                        balloonContentHeader: parseEntry.objects[j].objName,
                        balloonContentBody: ["Адрес:", parseEntry.objects[j].objAddress].join(" "),
                        balloonContentFooter: [parseEntry.objects[j].objCategory, "<br>", parseEntry.objects[j].objCoordinates].join(" "),
                        hintContent: parseEntry.objects[j].objName
                    }));
                    mapObject.geoObjects.add(parseGeoObjects);
                }
                //console.log(parseObjectsEntryLength);
            }
}

ymaps.ready(init);