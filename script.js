// Data Simulasi Transaksi Multi-Channel OTA
const bookingData = [
    { id: "BK-901", guest: "Budi Santoso", channel: "Traveloka", otaClass: "ota-traveloka", room: "Deluxe Ocean View", nights: 3, price: 4500000, status: "confirmed" },
    { id: "BK-902", guest: "Siti Rahma", channel: "Tiket.com", otaClass: "ota-tiket", room: "Grand Deluxe King", nights: 2, price: 3200000, status: "confirmed" },
    { id: "BK-903", guest: "Michael Scott", channel: "Agoda", otaClass: "ota-agoda", room: "Superior Room", nights: 1, price: 1200000, status: "confirmed" },
    { id: "BK-904", guest: "Jessica Tan", channel: "Booking.com", otaClass: "ota-booking", room: "Executive Suite", nights: 2, price: 5000000, status: "confirmed" },
    { id: "BK-905", guest: "Ahmad Dahlan", channel: "Expedia", otaClass: "ota-expedia", room: "Deluxe Ocean View", nights: 2, price: 3000000, status: "cancelled" },
    { id: "BK-906", guest: "David Kim", channel: "Trip.com", otaClass: "ota-trip", room: "Superior Room", nights: 4, price: 4800000, status: "confirmed" },
    { id: "BK-907", guest: "Rina Wijaya", channel: "Direct Website", otaClass: "ota-website", room: "Presidential Suite", nights: 2, price: 8500000, status: "confirmed" },
    { id: "BK-908", guest: "Eko Prasetyo", channel: "Traveloka", otaClass: "ota-traveloka", room: "Superior Room", nights: 1, price: 1200000, status: "pending" }
];

// Helper Format Rupiah
function formatRupiah(number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(number);
}

// Render Semua Menu & Data
function renderAllPages() {
    let totalRev = 0;
    let totalNights = 0;
    let validBookingsCount = 0;
    const channelStats = {};
    const roomStats = {};

    bookingData.forEach(item => {
        if (item.status !== 'cancelled') {
            totalRev += item.price;
            totalNights += item.nights;
            validBookingsCount++;

            if (!channelStats[item.channel]) {
                channelStats[item.channel] = { count: 0, nights: 0, rev: 0 };
            }
            channelStats[item.channel].count++;
            channelStats[item.channel].nights += item.nights;
            channelStats[item.channel].rev += item.price;

            if (!roomStats[item.room]) {
                roomStats[item.room] = { count: 0, rev: 0, nights: 0 };
            }
            roomStats[item.room].count++;
            roomStats[item.room].rev += item.price;
            roomStats[item.room].nights += item.nights;
        }
    });

    const adr = validBookingsCount > 0 ? (totalRev / totalNights) : 0;

    // 1. OVERVIEW
    const overviewBody = document.getElementById('bookingTableBody');
    if (overviewBody) {
        overviewBody.innerHTML = '';
        bookingData.forEach(item => {
            overviewBody.innerHTML += `
                <tr>
                    <td><strong>${item.id}</strong></td>
                    <td><span class="channel-badge ${item.otaClass}">${item.channel}</span></td>
                    <td>${item.room}</td>
                    <td>${item.nights} Malam</td>
                    <td>${formatRupiah(item.price)}</td>
                    <td><span class="badge ${item.status}">${item.status.toUpperCase()}</span></td>
                </tr>
            `;
        });
    }

    let topChannelName = "-";
    let maxRev = 0;
    for (const [ch, data] of Object.entries(channelStats)) {
        if (data.rev > maxRev) {
            maxRev = data.rev;
            topChannelName = ch;
        }
    }

    document.getElementById('totalRevenue').innerText = formatRupiah(totalRev);
    document.getElementById('roomNights').innerText = totalNights + " Room Nights";
    document.getElementById('adrValue').innerText = formatRupiah(adr);
    document.getElementById('topChannel').innerText = topChannelName;

    // 2. OTA BREAKDOWN
    const otaBody = document.getElementById('otaBreakdownBody');
    if (otaBody) {
        otaBody.innerHTML = '';
        for (const [ch, data] of Object.entries(channelStats)) {
            const share = ((data.rev / totalRev) * 100).toFixed(1);
            const comm = data.rev * 0.15;
            otaBody.innerHTML += `
                <tr>
                    <td><strong>${ch}</strong></td>
                    <td>${data.count} Booking</td>
                    <td>${data.nights} Malam</td>
                    <td>${formatRupiah(data.rev)}</td>
                    <td>${formatRupiah(comm)}</td>
                    <td><strong>${share}%</strong></td>
                </tr>
            `;
        }
    }

    // 3. RESERVATIONS LIST
    const resBody = document.getElementById('allReservationsBody');
    if (resBody) {
        resBody.innerHTML = '';
        bookingData.forEach(item => {
            resBody.innerHTML += `
                <tr>
                    <td><strong>${item.id}</strong></td>
                    <td>${item.guest}</td>
                    <td><span class="channel-badge ${item.otaClass}">${item.channel}</span></td>
                    <td>${item.room}</td>
                    <td>${item.nights} Malam</td>
                    <td>${formatRupiah(item.price)}</td>
                    <td><span class="badge ${item.status}">${item.status.toUpperCase()}</span></td>
                </tr>
            `;
        });
    }

    // 4. ADR & OCCUPANCY
    const roomBody = document.getElementById('roomTypeAnalyticsBody');
    if (roomBody) {
        roomBody.innerHTML = '';
        for (const [room, data] of Object.entries(roomStats)) {
            const roomAdr = data.rev / data.nights;
            roomBody.innerHTML += `
                <tr>
                    <td><strong>${room}</strong></td>
                    <td>${data.count} Booking (${data.nights} Malam)</td>
                    <td>${formatRupiah(data.rev)}</td>
                    <td>${formatRupiah(roomAdr)}</td>
                </tr>
            `;
        }
    }

    const revparEl = document.getElementById('revparValue');
    if (revparEl) {
        revparEl.innerText = formatRupiah(adr * 0.785);
    }
}

// Mobile Sidebar Controls
function setupMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const mobileToggleBtn = document.getElementById('mobileToggleBtn');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');

    function openSidebar() {
        sidebar.classList.add('show');
        overlay.classList.add('active');
    }

    function closeSidebar() {
        sidebar.classList.remove('show');
        overlay.classList.remove('active');
    }

    if (mobileToggleBtn) mobileToggleBtn.addEventListener('click', openSidebar);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);

    return closeSidebar;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    renderAllPages();
    const closeSidebar = setupMobileSidebar();

    const navItems = document.querySelectorAll('.nav-item');
    const contentSections = document.querySelectorAll('.content-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();

            navItems.forEach(nav => nav.classList.remove('active'));
            contentSections.forEach(section => section.classList.remove('active-section'));

            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active-section');
            }

            // Otomatis Sembunyikan Sidebar Setelah Menu Diklik (Mobile)
            closeSidebar();
        });
    });

    const btnRefresh = document.getElementById('btnRefresh');
    if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
            alert('🔄 Sync Data OTA Berhasil!');
            renderAllPages();
        });
    }
});