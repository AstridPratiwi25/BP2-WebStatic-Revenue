// Data Simulasi Transaksi Multi-Channel OTA untuk Grand Luxury Hotel
const bookingData = [
    { id: "BK-901", channel: "Traveloka", otaClass: "ota-traveloka", room: "Deluxe Ocean View", nights: 3, price: 4500000, status: "confirmed" },
    { id: "BK-902", channel: "Tiket.com", otaClass: "ota-tiket", room: "Grand Deluxe King", nights: 2, price: 3200000, status: "confirmed" },
    { id: "BK-903", channel: "Agoda", otaClass: "ota-agoda", room: "Superior Room", nights: 1, price: 1200000, status: "confirmed" },
    { id: "BK-904", channel: "Booking.com", otaClass: "ota-booking", room: "Executive Suite", nights: 2, price: 5000000, status: "confirmed" },
    { id: "BK-905", channel: "Expedia", otaClass: "ota-expedia", room: "Deluxe Ocean View", nights: 2, price: 3000000, status: "cancelled" },
    { id: "BK-906", channel: "Trip.com", otaClass: "ota-trip", room: "Superior Room", nights: 4, price: 4800000, status: "confirmed" },
    { id: "BK-907", channel: "Direct Website", otaClass: "ota-website", room: "Presidential Suite", nights: 2, price: 8500000, status: "confirmed" },
    { id: "BK-908", channel: "Traveloka", otaClass: "ota-traveloka", room: "Superior Room", nights: 1, price: 1200000, status: "pending" }
];

// Helper Format Rupiah
function formatRupiah(number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(number);
}

// 1. Render Overview Dashboard
function renderDashboard() {
    const tableBody = document.getElementById('bookingTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    let totalRev = 0;
    let totalNights = 0;
    let validBookingsCount = 0;
    const channelRevenue = {};

    bookingData.forEach(item => {
        if (item.status !== 'cancelled') {
            totalRev += item.price;
            totalNights += item.nights;
            validBookingsCount++;
            channelRevenue[item.channel] = (channelRevenue[item.channel] || 0) + item.price;
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${item.id}</strong></td>
            <td><span class="channel-badge ${item.otaClass}">${item.channel}</span></td>
            <td>${item.room}</td>
            <td>${item.nights} Malam</td>
            <td>${formatRupiah(item.price)}</td>
            <td><span class="badge ${item.status}">${item.status.toUpperCase()}</span></td>
        `;
        tableBody.appendChild(row);
    });

    let topChannelName = "-";
    let maxRev = 0;
    for (const [channel, rev] of Object.entries(channelRevenue)) {
        if (rev > maxRev) {
            maxRev = rev;
            topChannelName = channel;
        }
    }

    const adr = validBookingsCount > 0 ? (totalRev / totalNights) : 0;

    document.getElementById('totalRevenue').innerText = formatRupiah(totalRev);
    document.getElementById('roomNights').innerText = totalNights + " Room Nights";
    document.getElementById('adrValue').innerText = formatRupiah(adr);
    document.getElementById('topChannel').innerText = topChannelName;

    renderOTABreakdown(channelRevenue, totalRev);
    renderAllReservations();
}

// 2. Render OTA Breakdown Page
function renderOTABreakdown(channelRevenue, totalRev) {
    const otaBody = document.getElementById('otaBreakdownBody');
    if (!otaBody) return;
    otaBody.innerHTML = '';

    for (const [channel, rev] of Object.entries(channelRevenue)) {
        const count = bookingData.filter(b => b.channel === channel && b.status !== 'cancelled').length;
        const percentage = totalRev > 0 ? ((rev / totalRev) * 100).toFixed(1) : 0;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${channel}</strong></td>
            <td>${count} Booking</td>
            <td>${formatRupiah(rev)}</td>
            <td><strong>${percentage}%</strong></td>
        `;
        otaBody.appendChild(row);
    }
}

// 3. Render All Reservations Page
function renderAllReservations() {
    const resBody = document.getElementById('allReservationsBody');
    if (!resBody) return;
    resBody.innerHTML = '';

    bookingData.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${item.id}</strong></td>
            <td><span class="channel-badge ${item.otaClass}">${item.channel}</span></td>
            <td>${item.room}</td>
            <td>${item.nights} Malam</td>
            <td>${formatRupiah(item.price)}</td>
            <td><span class="badge ${item.status}">${item.status.toUpperCase()}</span></td>
        `;
        resBody.appendChild(row);
    });
}

// 4. Fitur Navigasi Interaktif Sidebar
document.addEventListener('DOMContentLoaded', () => {
    renderDashboard();

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
        });
    });

    const btnRefresh = document.getElementById('btnRefresh');
    if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
            alert('🔄 Sync Data OTA Berhasil!');
            renderDashboard();
        });
    }
});