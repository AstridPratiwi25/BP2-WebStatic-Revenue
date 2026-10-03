// Data Simulasi Transaksi Multi-Channel OTA
const bookingData = [
    { id: "BK-901", channel: "Traveloka", otaClass: "ota-traveloka", hotel: "The Laguna Resort Bali", room: "Deluxe Ocean View", nights: 3, price: 6200000, status: "confirmed" },
    { id: "BK-902", channel: "Tiket.com", otaClass: "ota-tiket", hotel: "Hotel Indonesia Kempinski", room: "Grand Deluxe King", nights: 2, price: 5400000, status: "confirmed" },
    { id: "BK-903", channel: "Agoda", otaClass: "ota-agoda", hotel: "Alila Ubud Bali", room: "Superior Room", nights: 1, price: 1850000, status: "confirmed" },
    { id: "BK-904", channel: "Booking.com", otaClass: "ota-booking", hotel: "Pullman Bandung Grand Central", room: "Executive Suite", nights: 2, price: 4200000, status: "confirmed" },
    { id: "BK-905", channel: "Expedia", otaClass: "ota-expedia", hotel: "Vasa Hotel Surabaya", room: "Select Room", nights: 2, price: 2300000, status: "cancelled" },
    { id: "BK-906", channel: "Trip.com", otaClass: "ota-trip", hotel: "Aryaduta Menteng", room: "Superior Suite", nights: 4, price: 3800000, status: "confirmed" },
    { id: "BK-907", channel: "Direct Website", otaClass: "ota-website", hotel: "Padma Hotel Bandung", room: "Premier Balcony", nights: 2, price: 4900000, status: "confirmed" },
    { id: "BK-908", channel: "Traveloka", otaClass: "ota-traveloka", hotel: "Jwaneng Hotel Jogja", room: "Standard Double", nights: 1, price: 650000, status: "pending" }
];

// Helper Format Rupiah
function formatRupiah(number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(number);
}

// Render Data Dashboard
function renderDashboard() {
    const tableBody = document.getElementById('bookingTableBody');
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

            // Hitung revenue per channel
            channelRevenue[item.channel] = (channelRevenue[item.channel] || 0) + item.price;
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${item.id}</strong></td>
            <td><span class="channel-badge ${item.otaClass}">${item.channel}</span></td>
            <td>${item.hotel}</td>
            <td>${item.room}</td>
            <td>${item.nights} Malam</td>
            <td>${formatRupiah(item.price)}</td>
            <td><span class="badge ${item.status}">${item.status.toUpperCase()}</span></td>
        `;
        tableBody.appendChild(row);
    });

    // Cari Top Channel
    let topChannelName = "-";
    let maxRev = 0;
    for (const [channel, rev] of Object.entries(channelRevenue)) {
        if (rev > maxRev) {
            maxRev = rev;
            topChannelName = channel;
        }
    }

    // Hitung Metrics
    const adr = validBookingsCount > 0 ? (totalRev / totalNights) : 0;

    // Update Kartu KPI
    document.getElementById('totalRevenue').innerText = formatRupiah(totalRev);
    document.getElementById('roomNights').innerText = totalNights + " Room Nights";
    document.getElementById('adrValue').innerText = formatRupiah(adr);
    document.getElementById('topChannel').innerText = topChannelName;
}

// Button Sync/Refresh Event
document.getElementById('btnRefresh').addEventListener('click', () => {
    alert('🔄 Sinkronisasi data real-time dengan Traveloka, Tiket, Agoda, Booking, Expedia, Trip.com & Website berhasil!');
    renderDashboard();
});

// Jalankan awal
document.addEventListener('DOMContentLoaded', renderDashboard);