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
let pieChartInstance = null;
let barChartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
    const tableHead = document.getElementById('table-head');
    const tableBody = document.getElementById('table-body');
    const currentTabTitle = document.getElementById('current-tab-title');
    const navLinks = document.querySelectorAll('.nav-link');
    const filterConverted = document.getElementById('filter-converted');
    const monthFilter = document.getElementById('month-filter');
    const yearFilter = document.getElementById('year-filter');
    const searchFilter = document.getElementById('search-filter');
    
    currentTabTitle.textContent = "Loading Live Data...";
    
    await loadAllData();

    let currentTab = 'In Funnel';

    const isExcluded = (row, tab) => {
        const valStr = Object.values(row).join(' ').toLowerCase();
        if(tab === 'In Funnel' && valStr.includes('closed') && !valStr.includes('won')) {
             return false; 
        }
        return false;
    };

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

    const matchesYear = (row, yearStr) => {
        if (yearStr === 'All') return true;
        const rowStr = Object.values(row).join(' ').toLowerCase();
        return rowStr.includes(yearStr.toLowerCase());
    };

    const matchesSearch = (row, query) => {
        if (!query.trim()) return true;
        const rowStr = Object.values(row).join(' ').toLowerCase();
        return rowStr.includes(query.trim().toLowerCase());
    };

    const renderTable = () => {
        const data = liveData[currentTab];
        if (!data || data.length === 0) {
            tableHead.innerHTML = '<th>Status</th>';
            tableBody.innerHTML = '<tr><td>No data found or sheet is private.</td></tr>';
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

        const filteredData = data.filter(item => {
            if (isExcluded(item, currentTab)) return false;
            const passConverted = filterConverted.checked ? 
                Object.values(item).join(' ').toLowerCase().includes('converted') || Object.values(item).join(' ').toLowerCase().includes('won') : true;
            return passConverted && matchesMonth(item, monthFilter.value) && matchesYear(item, yearFilter.value) && matchesSearch(item, searchFilter.value);
        });

        filteredData.forEach(item => {
            const tr = document.createElement('tr');
            headers.forEach(header => {
                const td = document.createElement('td');
                const val = item[header] || '';
                
                if (val.toLowerCase().includes('closed') || val.toLowerCase().includes('lost')) td.innerHTML = `<span class="danger">${val}</span>`;
                else if (val.toLowerCase().includes('won') || val.toLowerCase().includes('converted')) td.innerHTML = `<span class="success">${val}</span>`;
                else td.textContent = val;
                
                tr.appendChild(td);
            });
            tableBody.appendChild(tr);
        });

        calculateMetrics();
    };

    function calculateMetrics() {
        let total = 0, inFunnel = 0, converted = 0;
        
        Object.keys(liveData).forEach(tab => {
            liveData[tab].forEach(row => {
                if (isExcluded(row, tab)) return;
                const passConverted = filterConverted.checked ? 
                    Object.values(row).join(' ').toLowerCase().includes('converted') || Object.values(row).join(' ').toLowerCase().includes('won') : true;

                if (passConverted && matchesMonth(row, monthFilter.value) && matchesYear(row, yearFilter.value) && matchesSearch(row, searchFilter.value)) {
                    total++;
                    const rowStr = Object.values(row).join(' ').toLowerCase();
                    if (rowStr.includes('in funnel') || rowStr.includes('progress') || tab === 'In Funnel') inFunnel++;
                    if (rowStr.includes('converted') || rowStr.includes('won')) converted++;
                }
            });
        });

        document.getElementById('total-leads').textContent = total;
        document.getElementById('in-funnel').textContent = inFunnel;
        document.getElementById('converted').textContent = converted;
        document.getElementById('conversion-rate').textContent = total > 0 ? ((converted/total)*100).toFixed(1) + '%' : '0%';
    }

    renderTable();

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
    yearFilter.addEventListener('change', renderTable);
    searchFilter.addEventListener('input', renderTable);

    // PDF Report Generator Flow
    const downloadBtn = document.getElementById('download-pdf');
    const modal = document.getElementById('report-modal');
    const cancelModal = document.getElementById('modal-cancel');
    const generateModal = document.getElementById('modal-generate');
    const modalMonth = document.getElementById('modal-month');
    const modalYear = document.getElementById('modal-year');
    const hiddenReport = document.getElementById('hidden-report-container');

    downloadBtn.addEventListener('click', () => {
        modal.style.display = 'flex';
    });

    cancelModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    generateModal.addEventListener('click', async () => {
        generateModal.textContent = "Generating...";
        generateModal.disabled = true;

        const selMonth = modalMonth.value;
        const selYear = modalYear.value;
        const monthText = modalMonth.options[modalMonth.selectedIndex].text;
        
        // 1. Compute Metrics for Report
        let repTotal = 0, repFunnel = 0, repConverted = 0;
        let tabCounts = {}; Object.keys(TABS).forEach(t => tabCounts[t] = 0);
        let consolidatedTables = '';

        Object.keys(liveData).forEach(tab => {
            let tabHtml = '';
            let rowsInTab = 0;
            const data = liveData[tab];
            if(data.length > 0) {
                const headers = Object.keys(data[0]);
                tabHtml += `<h4 style="margin-top:2rem; margin-bottom:0.5rem; color:#1A73E8;">${tab}</h4>`;
                tabHtml += `<table class="print-reports-table"><thead><tr>`;
                headers.forEach(h => tabHtml += `<th>${h}</th>`);
                tabHtml += `</tr></thead><tbody>`;

                data.forEach(row => {
                    if (isExcluded(row, tab)) return;
                    if (matchesMonth(row, selMonth) && matchesYear(row, selYear)) {
                        repTotal++;
                        tabCounts[tab]++;
                        const rowStr = Object.values(row).join(' ').toLowerCase();
                        if (rowStr.includes('in funnel') || rowStr.includes('progress') || tab === 'In Funnel') repFunnel++;
                        if (rowStr.includes('converted') || rowStr.includes('won')) repConverted++;
                        
                        tabHtml += `<tr>`;
                        headers.forEach(h => tabHtml += `<td>${row[h] || ''}</td>`);
                        tabHtml += `</tr>`;
                        rowsInTab++;
                    }
                });
                tabHtml += `</tbody></table>`;
            }
            if(rowsInTab > 0) consolidatedTables += tabHtml;
        });

        if(repTotal === 0) consolidatedTables = "<p>No leads found for the selected time period.</p>";

        // 2. Populate HTML
        document.getElementById('print-date-range').textContent = `${selMonth === 'All' ? 'All Time' : monthText} ${selYear === 'All' ? '' : selYear}`;
        document.getElementById('print-total').textContent = repTotal;
        document.getElementById('print-funnel').textContent = repFunnel;
        document.getElementById('print-converted').textContent = repConverted;
        document.getElementById('print-rate').textContent = repTotal > 0 ? ((repConverted/repTotal)*100).toFixed(1) + '%' : '0%';
        document.getElementById('print-tables-container').innerHTML = consolidatedTables;

        // 3. Render ChartJS
        hiddenReport.style.display = 'block'; // Unhide to render charts properly measuring dimensions
        
        if (pieChartInstance) pieChartInstance.destroy();
        if (barChartInstance) barChartInstance.destroy();

        const ctxStatus = document.getElementById('statusChart').getContext('2d');
        pieChartInstance = new Chart(ctxStatus, {
            type: 'doughnut',
            data: {
                labels: ['Converted', 'In Funnel', 'Lost/Other'],
                datasets: [{
                    data: [repConverted, repFunnel, repTotal - repConverted - repFunnel],
                    backgroundColor: ['#10B981', '#F9A825', '#DC3545']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });

        const ctxObj = document.getElementById('categoryChart').getContext('2d');
        barChartInstance = new Chart(ctxObj, {
            type: 'bar',
            data: {
                labels: Object.keys(tabCounts).filter(k => tabCounts[k] > 0),
                datasets: [{
                    label: 'Number of Leads',
                    data: Object.keys(tabCounts).filter(k => tabCounts[k] > 0).map(k => tabCounts[k]),
                    backgroundColor: '#1A73E8'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });

        // 4. Fire html2pdf
        const opt = {
            margin:       0.3,
            filename:     `KlearStack_Report_${selMonth}_${selYear}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true }, // useCORS allows KlearStack logo to load
            jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
        };

        // Small delay to let charts finish animation
        setTimeout(() => {
            html2pdf().set(opt).from(document.getElementById('print-layout')).save().then(() => {
                hiddenReport.style.display = 'none';
                modal.style.display = 'none';
                generateModal.textContent = "Generate & Download";
                generateModal.disabled = false;
            });
        }, 500);
    });
});

async function loadAllData() {
    for (const [tabName, gid] of Object.entries(TABS)) {
        const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error("Private sheet or failed");
            const csvText = await response.text();
            
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
