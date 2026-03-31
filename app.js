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

    const statusFilter = document.getElementById('status-filter');

    // Scan for dynamic periods available in exactly this spreadsheet using strict extraction
    const populateFilters = () => {
        const foundPeriods = new Set();
        const foundStatuses = new Set();
        const now = new Date();
        
        Object.values(liveData).forEach(tab => {
            tab.forEach(row => {
                // Periods
                const periods = getPeriodsFromRow(row);
                periods.forEach(p => {
                    const parsed = new Date(`01 ${p}`);
                    // Ensure dates are <= Current Date, and >= 2022
                    if (parsed <= now && parsed.getFullYear() >= 2022) {
                        foundPeriods.add(p);
                    }
                });

                // Statuses
                if (row['Status'] && row['Status'].trim() !== '') {
                    foundStatuses.add(row['Status'].trim());
                }
            });
        });

        // Populate Periods
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

        // Populate Statuses
        statusFilter.innerHTML = '<option value="All">All Statuses</option>';
        Array.from(foundStatuses).sort().forEach(s => {
            const opt = document.createElement('option');
            opt.value = s; opt.textContent = s;
            statusFilter.appendChild(opt);
        });
    };
    
    populateFilters();

    const matchesPeriod = (row, periodValue) => {
        if (periodValue === 'All') return true;
        const rowPeriods = getPeriodsFromRow(row);
        return rowPeriods.has(periodValue);
    };

    const matchesStatus = (row, statusValue) => {
        if (statusValue === 'All') return true;
        return row['Status'] && row['Status'].trim() === statusValue;
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
            
            let passConverted = true;
            let passPeriod = true;

            if (currentTab !== 'In Funnel') {
                passConverted = filterConverted.checked ? 
                    Object.values(item).join(' ').toLowerCase().includes('converted') || Object.values(item).join(' ').toLowerCase().includes('won') : true;
                passPeriod = matchesPeriod(item, periodFilter.value);
            }

            return passConverted && passPeriod && matchesSearch(item, searchFilter.value) && matchesStatus(item, statusFilter.value);
        });

        if (filteredData.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="${headers.length}" style="text-align:center; padding: 3rem 1rem; color: #666; font-size: 1.1rem; background: #fafafa;">No leads found in <strong>${currentTab}</strong> matching your selected filters.<br><span style="font-size: 0.9rem; color: #999;">Check the tabs above or broaden your filter criteria.</span></td></tr>`;
        } else {
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
        }

        calculateMetricsAndUpdateBadges();
    };

    function calculateMetricsAndUpdateBadges() {
        let total = 0, inFunnel = 0, converted = 0;
        
        // Calculate global metrics and update Tab navigation badges
        navLinks.forEach(link => {
            const tName = link.getAttribute('data-tab');
            let tabCount = 0;
            
            if (liveData[tName]) {
                liveData[tName].forEach(row => {
                    if (isExcluded(row, tName)) return;
                    
                    let pConv = true;
                    let pPer = true;
                    if (tName !== 'In Funnel') {
                        pConv = filterConverted.checked ? 
                            Object.values(row).join(' ').toLowerCase().includes('converted') || Object.values(row).join(' ').toLowerCase().includes('won') : true;
                        pPer = matchesPeriod(row, periodFilter.value);
                    }

                    if (pConv && pPer && matchesSearch(row, searchFilter.value) && matchesStatus(row, statusFilter.value)) {
                        total++;
                        tabCount++;
                        const rowStr = Object.values(row).join(' ').toLowerCase();
                        if (rowStr.includes('in funnel') || rowStr.includes('progress') || tName === 'In Funnel') inFunnel++;
                        if (rowStr.includes('converted') || rowStr.includes('won')) converted++;
                    }
                });
            }

            // Inject badge into tab
            const isActive = currentTab === tName;
            link.innerHTML = `${tName} <span style="display:inline-block; background: ${isActive ? '#fff' : '#1A73E8'}; color: ${isActive ? '#1A73E8' : '#fff'}; padding: 2px 10px; border-radius: 20px; font-weight: 700; font-size: 0.8rem; margin-left: 8px; transition: all 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${tabCount}</span>`;
        });

        document.getElementById('total-leads').textContent = total;
        document.getElementById('in-funnel').textContent = inFunnel;
        document.getElementById('converted').textContent = converted;
        document.getElementById('conversion-rate').textContent = total > 0 ? ((converted/total)*100).toFixed(1) + '%' : '0%';
    }

    renderTable();

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            // Re-render UI classes manually since innerHTML changes
            currentTab = e.currentTarget.getAttribute('data-tab');
            navLinks.forEach(nl => nl.classList.remove('active'));
            e.currentTarget.classList.add('active');
            renderTable();
        });
    });

    filterConverted.addEventListener('change', renderTable);
    periodFilter.addEventListener('change', renderTable);
    statusFilter.addEventListener('change', renderTable);
    searchFilter.addEventListener('input', renderTable);

    // PDF Report Generator Flow
    const downloadBtn = document.getElementById('download-pdf');
    const modal = document.getElementById('report-modal');
    const cancelModal = document.getElementById('modal-cancel');
    const generateExecBtn = document.getElementById('modal-generate');
    const generateSlidesBtn = document.getElementById('modal-generate-slides');
    const modalPeriod = document.getElementById('modal-period');
    
    // Containers
    const hiddenReport = document.getElementById('hidden-report-container');
    const hiddenSlides = document.getElementById('hidden-presentation-container');

    downloadBtn.addEventListener('click', () => {
        modal.style.display = 'flex';
    });

    cancelModal.addEventListener('click', () => {
        modal.style.display = 'none';
        hiddenReport.style.display = 'none';
        hiddenSlides.style.display = 'none';
    });

    const lockButtons = (text) => {
        generateExecBtn.textContent = text;
        generateSlidesBtn.textContent = text;
        generateExecBtn.disabled = true;
        generateSlidesBtn.disabled = true;
    }

    const unlockButtons = () => {
        generateExecBtn.textContent = 'Executive 1-Pager';
        generateSlidesBtn.textContent = 'Monthly Slide Deck';
        generateExecBtn.disabled = false;
        generateSlidesBtn.disabled = false;
    }

    // 1-Pager Logic
    generateExecBtn.addEventListener('click', async () => {
        lockButtons("Generating...");
        const selPeriod = modalPeriod.value;
        const selPeriodText = modalPeriod.options[modalPeriod.selectedIndex].text;
        
        // Compute Metrics
        let repTotal = 0, repFunnel = 0, repConverted = 0;
        let tabCounts = {}; Object.keys(TABS).forEach(t => tabCounts[t] = 0);

        Object.keys(liveData).forEach(tab => {
            liveData[tab].forEach(row => {
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

        document.getElementById('print-date-range').textContent = selPeriodText;
        document.getElementById('print-total').textContent = repTotal;
        document.getElementById('print-funnel').textContent = repFunnel;
        document.getElementById('print-converted').textContent = repConverted;
        document.getElementById('print-rate').textContent = repTotal > 0 ? ((repConverted/repTotal)*100).toFixed(1) + '%' : '0%';

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

        const opt = {
            margin:       0,
            filename:     `KlearStack_Executive_${selPeriod.replace(' ', '_')}.pdf`,
            image:        { type: 'jpeg', quality: 1 },
            html2canvas:  { scale: 2, useCORS: true, letterRendering: true }, 
            jsPDF:        { unit: 'px', format: [800, 1100], orientation: 'portrait' } 
        };

        setTimeout(() => {
            html2pdf().set(opt).from(document.getElementById('print-layout')).save().then(() => {
                hiddenReport.style.display = 'none';
                modal.style.display = 'none';
                unlockButtons();
            });
        }, 600);
    });

    // Monthly Slide Deck Logic
    generateSlidesBtn.addEventListener('click', async () => {
        lockButtons("Compiling Slides...");
        const selPeriod = modalPeriod.value;
        const selPeriodText = modalPeriod.options[modalPeriod.selectedIndex].text;
        
        document.getElementById('slide-title-date').textContent = selPeriodText;
        document.getElementById('slide-monthly-title').textContent = `Leads Status for ${selPeriodText}`;

        // Helper to string-safe truncate
        const t = (str, len) => str && str.length > len ? str.substring(0, len) + '...' : (str || '-');

        const hideSlide = (slideId, breakId) => {
            document.getElementById(slideId).style.display = 'none';
            if(document.getElementById(breakId)) document.getElementById(breakId).style.display = 'none';
        };
        const showSlide = (slideId, breakId) => {
            document.getElementById(slideId).style.display = 'flex';
            if(document.getElementById(breakId)) document.getElementById(breakId).style.display = 'block';
        };

        // Slide 2: In Funnel
        const funnelBody = document.querySelector('#slide-table-funnel tbody');
        funnelBody.innerHTML = '';
        let fCount = 0;
        if(liveData['In Funnel']) {
            liveData['In Funnel'].forEach(row => {
                if(isExcluded(row, 'In Funnel')) return;
                if(matchesPeriod(row, selPeriod) && fCount < 10) { 
                    funnelBody.innerHTML += `<tr><td><strong>${t(row['Name'], 40)}</strong></td><td>${t(row['Details'], 80)}</td><td><span class="badge" style="background:#E8F0FE; color:#1A73E8;">${t(row['Status'], 30)}</span></td></tr>`;
                    fCount++;
                }
            });
        }
        if(fCount === 0) hideSlide('slide-page-funnel', 'break-funnel');
        else showSlide('slide-page-funnel', 'break-funnel');

        // Slide 3: Old Leads (Combining both Re-email tabs)
        const oldBody = document.querySelector('#slide-table-old tbody');
        oldBody.innerHTML = '';
        let oCount = 0;
        ['Re-emails (Nov-Jan)', 'Re-emails (Before Nov)'].forEach(tab => {
            if(liveData[tab]) {
                liveData[tab].forEach(row => {
                    if(isExcluded(row, tab)) return;
                    if(matchesPeriod(row, selPeriod) && oCount < 10) {
                        oldBody.innerHTML += `<tr><td><strong>${t(row['Name'], 40)}</strong></td><td>${t(row['Status'], 40)}</td><td>${t(row['Updated status'], 40)}</td></tr>`;
                        oCount++;
                    }
                });
            }
        });
        if(oCount === 0) hideSlide('slide-page-old', 'break-old');
        else showSlide('slide-page-old', 'break-old');

        // Slide 4: Monthly Status
        const monthlyBody = document.querySelector('#slide-table-monthly tbody');
        monthlyBody.innerHTML = '';
        let mCount = 0;
        if(liveData['Monthly Status']) {
            liveData['Monthly Status'].forEach(row => {
                if(isExcluded(row, 'Monthly Status')) return;
                if(matchesPeriod(row, selPeriod) && mCount < 10) {
                    monthlyBody.innerHTML += `<tr><td>${t(row['Source'], 30)}</td><td><strong>${t(row['Name'], 40)}</strong></td><td><span class="badge" style="background:#E8F0FE; color:#1A73E8;">${t(row['Status'], 40)}</span></td></tr>`;
                    mCount++;
                }
            });
        }
        if(mCount === 0) hideSlide('slide-page-monthly', 'break-monthly');
        else showSlide('slide-page-monthly', 'break-monthly');

        // Slide 5: Extra Activities
        const activitiesText = document.getElementById('modal-activities').value.trim();
        if (!activitiesText) {
            hideSlide('slide-page-activities', 'break-activities');
        } else {
            showSlide('slide-page-activities', 'break-activities');
            const ul = document.querySelector('.slide-activities-list');
            ul.innerHTML = '';
            activitiesText.split('\n').filter(l => l.trim()).forEach(line => {
                const parts = line.split('-');
                const strong = parts[0] ? parts[0].trim() : '';
                const span = parts[1] ? parts[1].trim() : '';
                ul.innerHTML += `<li><strong>${strong}</strong>${span ? `<span>${span}</span>` : ''}</li>`;
            });
        }

        hiddenSlides.style.display = 'block'; 

        const opt = {
            margin:       0,
            filename:     `KlearStack_Monthly_Presentation_${selPeriod.replace(' ', '_')}.pdf`,
            image:        { type: 'jpeg', quality: 1 },
            html2canvas:  { scale: 2, useCORS: true, letterRendering: true }, 
            jsPDF:        { unit: 'px', format: [1600, 900], orientation: 'landscape' } 
        };

        setTimeout(() => {
            html2pdf().set(opt).from(document.getElementById('presentation-layout')).save().then(() => {
                hiddenSlides.style.display = 'none';
                modal.style.display = 'none';
                unlockButtons();
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
