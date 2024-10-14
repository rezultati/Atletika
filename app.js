const API_KEY = '6703b16a1dfcc0df7f4b6f30';  // replace with your actual API key
const DB_URL = 'https://atletika-1ca7.restdb.io/rest/tablica';  // replace with your actual database URL


let currentPage = 1; // Tracks the current page of results
const resultsPerPage = 10; // Number of results to load per request
let filters = {
    discipline: '',
    competition: '',
    place: '',
    indoor: '',
    sort: 'date' // Default sort
};

// Fetch and populate the dropdown filters
function fetchFilters() {
    fetch(`${DB_URL}?apikey=${API_KEY}`, {
        method: 'GET'
    })
    .then(response => response.json())
    .then(data => {
        populateFilters(data);
    })
    .catch(error => console.error('Error fetching filters:', error));
}

// Populate filters dynamically based on fetched data
function populateFilters(data) {
    const disciplineFilter = document.getElementById('disciplineFilter');
    const competitionFilter = document.getElementById('competitionFilter');
    const placeFilter = document.getElementById('placeFilter');

    // Get unique disciplines, competitions, and places
    let disciplines = [...new Set(data.map(item => item.discipline))];
    let competitions = [...new Set(data.map(item => item.competition))];
    let places = [...new Set(data.map(item => item.place))];

    // Sort the arrays alphabetically
    disciplines.sort();
    competitions.sort();
    places.sort();

    // Populate discipline filter
    disciplines.forEach(discipline => {
        const option = document.createElement('option');
        option.value = discipline;
        option.text = discipline;
        disciplineFilter.appendChild(option);
    });

    // Populate competition filter
    competitions.forEach(competition => {
        const option = document.createElement('option');
        option.value = competition;
        option.text = competition;
        competitionFilter.appendChild(option);
    });

    // Populate place filter
    places.forEach(place => {
        const option = document.createElement('option');
        option.value = place;
        option.text = place;
        placeFilter.appendChild(option);
    });

    // Event listener to reset sort when "All" is selected for Discipline
    disciplineFilter.addEventListener('change', function() {
        const sortFilter = document.getElementById('sortFilter');
        if (this.value === '') {
            sortFilter.value = 'date';  // Reset to date
            filters.sort = 'date';
            sortFilter.disabled = true;  // Disable sort dropdown when discipline is "All"
        } else {
            sortFilter.disabled = false;  // Enable sorting when a specific discipline is selected
        }
        applyFilters();
    });
}

// Fetch results from restdb.io
function fetchResults(page = 1, append = false, sortDirection = 'DESC') {
    let queryString = `${DB_URL}?max=${resultsPerPage}&skip=${(page - 1) * resultsPerPage}&sort=${filters.sort}&dir=${sortDirection === 'ASC' ? 1 : -1}`;

    const filterConditions = [];

    if (filters.discipline) {
        filterConditions.push(`{"discipline": "${filters.discipline}"}`);
    }
    if (filters.competition) {
        filterConditions.push(`{"competition": "${filters.competition}"}`);
    }
    if (filters.place) {
        filterConditions.push(`{"place": "${filters.place}"}`);
    }
    if (filters.indoor) {
        filterConditions.push(`{"indoor": "${filters.indoor}"}`);
    }

    if (filterConditions.length > 0) {
        const filterQuery = encodeURIComponent(`{"$and": [${filterConditions.join(",")}]}`);
        queryString += `&q=${filterQuery}`;
    }

    fetch(`${queryString}&apikey=${API_KEY}`, {
        method: 'GET'
    })
    .then(response => response.json())
    .then(data => {
        displayResults(data, append);
    })
    .catch(error => console.error('Error fetching results:', error));
}

// Display results on the page
function displayResults(data, append = false) {
    const resultsList = document.getElementById('resultsList');
    if (!append) resultsList.innerHTML = '';

    data.forEach(result => {
        const li = document.createElement('li');
        li.classList.add('result-item');

        // Create the title section
        const title = document.createElement('div');
        title.classList.add('result-title');

        let displayText = `${result.discipline} - ${formatNumber(result.result)}`;
        const resultDate = formatDate(result.date);

        // If "time" is true, add formatted time before expanding
        if (result.time) {
            displayText = `${result.discipline} - ${formatTime(result.result)}`;
        }

        // Create the span element for the date and add it to the title
        title.innerHTML = `${displayText} <span class="result-date">${resultDate}</span>`;
        title.addEventListener('click', () => toggleDetails(li));

        // Create the details section
        const details = document.createElement('div');
        details.classList.add('result-details');
        details.innerHTML = `
            <p>Place: ${result.place}</p>
            <p>Competition: ${result.competition}</p>
            <p>Indoor/Outdoor: ${result.indoor}</p>
            <p>Remark: ${result.remark}</p>
        `;

        li.appendChild(title);
        li.appendChild(details);
        resultsList.appendChild(li);
    });
}

// Format the date as DD/MM/YYYY
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
}

// Format time result into MM:SS.ss format
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const sec = (seconds % 60).toFixed(2);
    return `${minutes.toString().padStart(2, '0')}:${sec.padStart(5, '0')}`;
}

// Format result numbers to 2 decimal places
function formatNumber(number) {
    return number.toFixed(2);
}

// Toggle details of a result item
function toggleDetails(item) {
    item.classList.toggle('expanded');
}

// Apply filters automatically after change
function applyFilters() {
    filters.discipline = document.getElementById('disciplineFilter').value;
    filters.competition = document.getElementById('competitionFilter').value;
    filters.place = document.getElementById('placeFilter').value;
    filters.indoor = document.getElementById('indoorFilter').value;
    filters.sort = document.getElementById('sortFilter').value;

    currentPage = 1;

    // If discipline is selected and sorting by result, check if all results have time = true
    if (filters.discipline && filters.sort === 'result') {
        fetch(`${DB_URL}?q={"discipline": "${filters.discipline}"}&apikey=${API_KEY}`, {
            method: 'GET'
        })
        .then(response => response.json())
        .then(data => {
            const allTimeBased = data.every(item => item.time === true);

            if (allTimeBased) {
                // If all records are time-based, sort by result in ascending order
                filters.sort = 'result';  // Keep the sort by result
                fetchResults(currentPage, false, 'ASC');  // Sort in ASC order
            } else {
                // If not all records are time-based, sort by result in descending order
                filters.sort = 'result';
                fetchResults(currentPage, false, 'DESC');  // Sort in DESC order
            }
        })
        .catch(error => console.error('Error fetching discipline data:', error));
    } else {
        // Fetch results with default sorting (e.g., by date or competition)
        fetchResults(currentPage);
    }
}

// Load more results
function loadMoreResults() {
    currentPage += 1;
    fetchResults(currentPage, true);
}

// Open the popup for adding a new result
function openAddNewPopup() {
    document.getElementById('addNewPopup').style.display = 'block';
    fetchUniqueDisciplines(); // Fetch unique disciplines from the API
}

// Fetch unique disciplines from the API
function fetchUniqueDisciplines() {
    fetch(`${DB_URL}?apikey=${API_KEY}`, {
        method: 'GET'
    })
    .then(response => response.json())
    .then(data => {
        const uniqueDisciplines = [...new Set(data.map(item => item.discipline))];
        populateDisciplines(uniqueDisciplines); // Populate the dropdown with unique disciplines
    })
    .catch(error => console.error('Error fetching unique disciplines:', error));
}

// Populate the disciplines dropdown
function populateDisciplines(uniqueDisciplines) {
    const disciplineSelect = document.getElementById('newDiscipline');
    disciplineSelect.innerHTML = ''; // Clear existing options
    uniqueDisciplines.forEach(discipline => {
        const option = document.createElement('option');
        option.value = discipline;
        option.textContent = discipline;
        disciplineSelect.appendChild(option);
    });
}

// Close any open popup
function closePopup() {
    document.getElementById('addNewPopup').style.display = 'none';
    resetForm(); // Reset the form when closing
    document.getElementById('successMessage').style.display = 'none';
}

// Reset the form fields
function resetForm() {
    const formElements = document.querySelectorAll('#addNewPopup input, #addNewPopup select');
    formElements.forEach(element => {
        element.value = '';
        element.classList.remove('error'); // Remove error class if exists
    });
}

// Submit new result
function submitNewResult() {
    const discipline = document.getElementById('newDiscipline').value;
    const result = document.getElementById('newResult').value;
    const competition = document.getElementById('newCompetition').value;
    const place = document.getElementById('newPlace').value;
    const indoor = document.getElementById('newIndoor').value;
    const date = document.getElementById('newDate').value;

    // Get the selected result unit
    const resultUnit = document.querySelector('input[name="resultUnit"]:checked').value;

    // Validate required fields
    let isValid = true;

    // Helper function to add error class
    function markFieldInvalid(fieldId) {
        document.getElementById(fieldId).classList.add('error');
        isValid = false;
    }

    // Validate each field and add red border if invalid
    if (!discipline) {
        markFieldInvalid('newDiscipline');
    }
    if (!result) {
        markFieldInvalid('newResult');
    }
    if (!competition) {
        markFieldInvalid('newCompetition');
    }
    if (!place) {
        markFieldInvalid('newPlace');
    }
    if (!indoor) {
        markFieldInvalid('newIndoor');
    }
    if (!date) {
        markFieldInvalid('newDate');
    }

    if (!isValid) {
        return; // Exit if validation fails
    }

    // Send 'true' for seconds and 'false' for meters
    const time = resultUnit === 'seconds'; 

    const newResult = {
        discipline,
        competition,
        place,
        indoor,
        date,
        result: parseFloat(result),
        remark: document.getElementById('newRemark').value,
        time // Correctly set 'time' based on the selected radio button
    };

    fetch(`${DB_URL}?apikey=${API_KEY}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(newResult)
    })
    .then(response => {
        if (response.ok) {
            closePopup();  // Close the form
            document.getElementById('successMessage').style.display = 'block';  // Show success message
            fetchResults();  // Reload results list
            resetForm();  // Reset form after successful submission
        } else {
            throw new Error('Failed to insert new result');
        }
    })
    .catch(error => console.error('Error adding new result:', error));
}

// Function to remove error class when the field changes
function removeErrorClass(event) {
    event.target.classList.remove('error');
}

// Add event listeners to remove error class when user interacts with the fields
document.getElementById('newDiscipline').addEventListener('input', removeErrorClass);
document.getElementById('newResult').addEventListener('input', removeErrorClass);
document.getElementById('newCompetition').addEventListener('input', removeErrorClass);
document.getElementById('newPlace').addEventListener('input', removeErrorClass);
document.getElementById('newIndoor').addEventListener('change', removeErrorClass); // for select
document.getElementById('newDate').addEventListener('change', removeErrorClass);   // for date input

// Function to reset the form after successful submission
function resetForm() {
    document.getElementById('newDiscipline').value = '';
    document.getElementById('newResult').value = '';
    document.getElementById('newCompetition').value = '';
    document.getElementById('newPlace').value = '';
    document.getElementById('newIndoor').value = '';
    document.getElementById('newDate').value = '';
    document.getElementById('newRemark').value = '';

    // Reset radio buttons, default to meters
    document.getElementById('resultMeters').checked = true;

    // Remove error styles
    const fields = ['newDiscipline', 'newResult', 'newCompetition', 'newPlace', 'newIndoor', 'newDate'];
    fields.forEach(fieldId => document.getElementById(fieldId).classList.remove('error'));
}

// Initializing the page by fetching filters and results
function initialize() {
    fetchFilters();
    fetchResults();
}

// Start the app
document.addEventListener('DOMContentLoaded', initialize);
