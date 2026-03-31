// Spreadsheet configuration
const SPREADSHEET_ID = '1RFQhh7y5Axz1eFpzPYWgRSnofqmSvWKd4ZLckOibMEY';
const TABS = {
    'In Funnel': '308834961',
    'Re-emails (Nov-Jan)': '2081698249',
    'Re-emails (Before Nov)': '162879228',
    'Closed Lost': '1909555875',
    'Monthly Status': '0'
};

let liveData = {};

document.addEventListener('DOMContentLoaded', async () => {
    const tableHead = document.getElementById('table-head');
    const tableBody = document.getElementById('table-body');
    const currentTabTitle = document.getElementById('current-tab-title');
    const navLinks = document.querySelectorAll('.nav-link');
    const downloadBtn = document.getElementById('download-pdf');
    const filterConverted = document.getElementById('filter-converted');
    const monthFilter = document.getElementById('month-filter');
    const searchFilter = document.getElementById('search-filter');
    
    // Set loading state
    currentTabTitle.textContent = "Loading Live Data...";
    
    // Fetch and parse all tabs
    await loadAllData();

    let currentTab = 'In Funnel';

    // Helper to check if a row is strike-through equivalent (usually means Junk/Closed/Irrelevant)
    const isExcluded = (row) => {
        const valStr = Object.values(row).join(' ').toLowerCase();
        if(currentTab === 'In Funnel' && valStr.includes('closed') && !valStr.includes('won')) {
             return false; 
        }
        return false;
    };

    // Helper to match month
    const matchesMonth = (row, monthStr) => {
        if (monthStr === 'All') return true;
        const rowStr = Object.values(row).join(' ').toLowerCase();
        const monthMap = {
            'Jan': ['jan', '/01/', '-01-', '01/'], 'Feb': ['feb', '/02/', '-02-', '02/'],
            'Mar': ['mar', '/03/', '-03-', '03/'], 'Apr': ['apr', '/04/', '-04-', '04/'],
            'May': ['may', '/05/', '-05-', '05/'], 'Jun': ['jun', '/06/', '-06-', '06/'],
            'Jul': ['jul', '/07/', '-07-', '07/'], 'Aug': ['aug', '/08/', '-08-', '08/'],
            'Sep': ['sep', '/09/', '-09-', '09/'], 'Oct': ['oct', '/10/', '-10-', '10/'],
            'Nov': ['nov', '/11/', '-11-', '11/'], 'Dec': ['dec', '/12/', '-12-', '12/']
        };
        return monthMap[monthStr].some(m => rowStr.includes(m));
    };

    // Helper to match search
    const matchesSearch = (row, query) => {
        if (!query.trim()) return true;
        const rowStr = Object.values(row).join(' ').toLowerCase();
        return rowStr.includes(query.trim().toLowerCase());
    };

    const renderTable = () => {
        const data = liveData[currentTab];
        if (!data || data.length === 0) {
            tableHead.innerHTML = '<th>Status</th>';
            tableBody.innerHTML = '<tr><td>No data found or sheet is private (Check Google Sheet permissions).</td></tr>';
            currentTabTitle.textContent = currentTab;
            return;
        }

        tableHead.innerHTML = '';
        tableBody.innerHTML = '';
        currentTabTitle.textContent = currentTab;

        const headers = Object.keys(data[0]);
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            tableHead.appendChild(th);
        });

        // Apply Filters
        const filteredData = data.filter(item => {
            if (isExcluded(item)) return false;
            
            const passConverted = filterConverted.checked ? 
                Object.values(item).join(' ').toLowerCase().includes('converted') || Object.values(item).join(' ').toLowerCase().includes('won') 
                : true;
            
            const passMonth = matchesMonth(item, monthFilter.value);
            const passSearch = matchesSearch(item, searchFilter.value);

            return passConverted && passMonth && passSearch;
        });

        filteredData.forEach(item => {
            const tr = document.createElement('tr');
            headers.forEach(header => {
                const td = document.createElement('td');
                const val = item[header] || '';
                
                if (val.toLowerCase().includes('closed') || val.toLowerCase().includes('lost')) {
                     td.innerHTML = `<span class="danger">${val}</span>`;
                } else if (val.toLowerCase().includes('won') || val.toLowerCase().includes('converted')) {
                     td.innerHTML = `<span class="success">${val}</span>`;
                } else {
                     td.textContent = val;
                }
                tr.appendChild(td);
            });
            tableBody.appendChild(tr);
        });

        calculateMetrics();
    };

    // Calculate dynamic metrics based on active filters
    function calculateMetrics() {
        let total = 0, inFunnel = 0, converted = 0;
        
        Object.values(liveData).forEach(tabData => {
            tabData.forEach(row => {
                if (isExcluded(row)) return;

                const passConverted = filterConverted.checked ? 
                    Object.values(row).join(' ').toLowerCase().includes('converted') || Object.values(row).join(' ').toLowerCase().includes('won') 
                    : true;
                
                const passMonth = matchesMonth(row, monthFilter.value);
                const passSearch = matchesSearch(row, searchFilter.value);

                if (passConverted && passMonth && passSearch) {
                    total++;
                    const rowStr = Object.values(row).join(' ').toLowerCase();
                    if (rowStr.includes('in funnel') || rowStr.includes('progress')) inFunnel++;
                    if (rowStr.includes('converted') || rowStr.includes('won')) converted++;
                }
            });
        });

        document.getElementById('total-leads').textContent = total;
        document.getElementById('in-funnel').textContent = inFunnel;
        document.getElementById('converted').textContent = converted;
        document.getElementById('conversion-rate').textContent = total > 0 ? ((converted/total)*100).toFixed(1) + '%' : '0%';
    }

    // Initial Render
    renderTable();

    // Event Listeners
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            navLinks.forEach(nl => nl.classList.remove('active'));
            e.target.classList.add('active');
            currentTab = e.target.getAttribute('data-tab');
            renderTable();
        });
    });

    filterConverted.addEventListener('change', renderTable);
    monthFilter.addEventListener('change', renderTable);
    searchFilter.addEventListener('input', renderTable);

    downloadBtn.addEventListener('click', () => {
        const element = document.getElementById('report-content');
        const opt = {
            margin:       0.5,
            filename:     'KlearStack_Sales_Report.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'landscape' }
        };

        downloadBtn.style.display = 'none'; 
        html2pdf().set(opt).from(element).save().then(() => {
            downloadBtn.style.display = 'block';
        });
    });
});

async function loadAllData() {
    for (const [tabName, gid] of Object.entries(TABS)) {
        // Use Google Visualization API endpoint to bypass CORS issues for public sheets
        const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error("Private sheet or failed");
            const csvText = await response.text();
            
            // Parse CSV with PapaParse
            const result = Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
            });
            
            liveData[tabName] = result.data;
        } catch (e) {
            console.error(`Failed to fetch ${tabName}: `, e);
            liveData[tabName] = [];
        }
    }
}
