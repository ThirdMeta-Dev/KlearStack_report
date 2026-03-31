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
    const periodFilter = document.getElementById('period-filter');
    const searchFilter = document.getElementById('search-filter');
    
    currentTabTitle.textContent = "Loading Live Data...";
    
    await loadAllData();

    let currentTab = 'In Funnel';

    // Helper functions for matching
    const isExcluded = (row, tab) => {
        const valStr = Object.values(row).join(' ').toLowerCase();
        if(tab === 'In Funnel' && valStr.includes('closed') && !valStr.includes('won')) return false; 
        return false;
    };

    // Strict Date Extraction RegEx
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    const getPeriodsFromRow = (row) => {
        const rowPeriods = new Set();
        Object.values(row).forEach(val => {
            if(!val) return;
            const str = String(val);
            
            // 1. MMM YYYY or DD MMM YYYY or MMM DD YYYY (e.g., 12 Jan 2024, Jan-24-2024, January 2024)
            const regex1 = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[-/\s,]+(?:[0-3]?[0-9][-/\s,]+)?(202[0-9])/gi;
            let m1;
            while((m1 = regex1.exec(str)) !== null) {
                let mIndex = monthNames.findIndex(mn => mn.toLowerCase() === m1[1].toLowerCase());
                if(mIndex !== -1) rowPeriods.add(`${monthNames[mIndex]} ${m1[2]}`);
            }

            // 2. MM/DD/YYYY or M/D/YYYY
            const regex2 = /(?:^|\D)(0?[1-9]|1[0-2])[-/][0-3]?[0-9][-/](202[0-9])(?:$|\D)/g;
            let m2;
            while((m2 = regex2.exec(str)) !== null) {
                rowPeriods.add(`${monthNames[parseInt(m2[1], 10) - 1]} ${m2[2]}`);
            }

            // 3. YYYY-MM-DD
            const regex3 = /(?:^|\D)(202[0-9])[-/](0?[1-9]|1[0-2])[-/][0-3]?[0-9](?:$|\D)/g;
            let m3;
            while((m3 = regex3.exec(str)) !== null) {
                rowPeriods.add(`${monthNames[parseInt(m3[2], 10) - 1]} ${m3[1]}`);
            }

            // 4. MM/YYYY
            const regex4 = /(?:^|\D)(0?[1-9]|1[0-2])[-/](202[0-9])(?:$|\D)/g;
            let m4;
            while((m4 = regex4.exec(str)) !== null) {
                rowPeriods.add(`${monthNames[parseInt(m4[1], 10) - 1]} ${m4[2]}`);
            }
        });
        return rowPeriods;
    };

    // Scan for dynamic periods available in exactly this spreadsheet using strict extraction
    const populatePeriods = () => {
        const foundPeriods = new Set();
        
        Object.values(liveData).forEach(tab => {
            tab.forEach(row => {
                const periods = getPeriodsFromRow(row);
                periods.forEach(p => foundPeriods.add(p));
            });
        });

        // Convert to array and sort chronologically (newest first)
        const periodList = Array.from(foundPeriods).sort((a,b) => {
            const dateA = new Date(`01 ${a}`); 
            const dateB = new Date(`01 ${b}`);
            return dateB - dateA; 
        });

        const periodFilter = document.getElementById('period-filter');
        const modalPeriod = document.getElementById('modal-period');
        
        periodFilter.innerHTML = '<option value="All">All Time</option>';
        modalPeriod.innerHTML = '<option value="All">All Time</option>';

        periodList.forEach(p => {
            const opt1 = document.createElement('option');
            opt1.value = p; opt1.textContent = p;
            periodFilter.appendChild(opt1);
            
            const opt2 = document.createElement('option');
            opt2.value = p; opt2.textContent = p;
            modalPeriod.appendChild(opt2);
        });
    };
    
    populatePeriods();

    // Check specific selected combined period
    const matchesPeriod = (row, periodValue) => {
        if (periodValue === 'All') return true;
        
        // Strict mapping check: Does this row contain the exact extracted period?
        const rowPeriods = getPeriodsFromRow(row);
        return rowPeriods.has(periodValue);
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
            return passConverted && matchesPeriod(item, periodFilter.value) && matchesSearch(item, searchFilter.value);
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

                if (passConverted && matchesPeriod(row, periodFilter.value) && matchesSearch(row, searchFilter.value)) {
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
    periodFilter.addEventListener('change', renderTable);
    searchFilter.addEventListener('input', renderTable);

    // PDF Report Generator Flow
    const downloadBtn = document.getElementById('download-pdf');
    const modal = document.getElementById('report-modal');
    const cancelModal = document.getElementById('modal-cancel');
    const generateModal = document.getElementById('modal-generate');
    const modalPeriod = document.getElementById('modal-period');
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

        const selPeriod = modalPeriod.value;
        
        // Compute Metrics for Report
        let repTotal = 0, repFunnel = 0, repConverted = 0;
        let tabCounts = {}; Object.keys(TABS).forEach(t => tabCounts[t] = 0);

        Object.keys(liveData).forEach(tab => {
            const data = liveData[tab];
            data.forEach(row => {
                if (isExcluded(row, tab)) return;
                if (matchesPeriod(row, selPeriod)) {
                    repTotal++;
                    tabCounts[tab]++;
                    const rowStr = Object.values(row).join(' ').toLowerCase();
                    if (rowStr.includes('in funnel') || rowStr.includes('progress') || tab === 'In Funnel') repFunnel++;
                    if (rowStr.includes('converted') || rowStr.includes('won')) repConverted++;
                }
            });
        });

        // Populate HTML (Removed massive data tables entirely)
        document.getElementById('print-date-range').textContent = selPeriod === 'All' ? 'All Time' : selPeriod;
        document.getElementById('print-total').textContent = repTotal;
        document.getElementById('print-funnel').textContent = repFunnel;
        document.getElementById('print-converted').textContent = repConverted;
        document.getElementById('print-rate').textContent = repTotal > 0 ? ((repConverted/repTotal)*100).toFixed(1) + '%' : '0%';

        // Render ChartJS
        hiddenReport.style.display = 'block'; 
        
        if (pieChartInstance) pieChartInstance.destroy();
        if (barChartInstance) barChartInstance.destroy();

        const ctxStatus = document.getElementById('statusChart').getContext('2d');
        pieChartInstance = new Chart(ctxStatus, {
            type: 'doughnut',
            data: {
                labels: ['Converted', 'In Funnel', 'Lost/Other'],
                datasets: [{
                    data: [repConverted, repFunnel, Math.max(0, repTotal - repConverted - repFunnel)],
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

        // Fire html2pdf precisely on portrait A4 without page breaks
        const opt = {
            margin:       0,
            filename:     `KlearStack_Executive_Report_${selPeriod.replace(' ', '_')}.pdf`,
            image:        { type: 'jpeg', quality: 1 },
            html2canvas:  { scale: 2, useCORS: true, letterRendering: true }, 
            jsPDF:        { unit: 'px', format: [800, 1100], orientation: 'portrait' } 
        };

        // Delay to let charts finish animation, then save perfect 1 pager
        setTimeout(() => {
            html2pdf().set(opt).from(document.getElementById('print-layout')).save().then(() => {
                hiddenReport.style.display = 'none';
                modal.style.display = 'none';
                generateModal.textContent = "Generate Report";
                generateModal.disabled = false;
            });
        }, 600);
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
