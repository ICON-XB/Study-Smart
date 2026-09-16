// Global University Database Presets
const globalUniversities = [
    // NAMIBIA (Preserve & Prioritize)
    { id: 'u_nust_na', name: 'Namibia University of Science and Technology', shortName: 'NUST', country: 'Namibia', continent: 'Africa', custom: false },
    { id: 'u_unam_na', name: 'University of Namibia', shortName: 'UNAM', country: 'Namibia', continent: 'Africa', custom: false },
    { id: 'u_ium_na', name: 'International University of Management', shortName: 'IUM', country: 'Namibia', continent: 'Africa', custom: false },

    // AFRICA
    { id: 'u_uct_za', name: 'University of Cape Town', shortName: 'UCT', country: 'South Africa', continent: 'Africa', custom: false },
    { id: 'u_sun_za', name: 'Stellenbosch University', shortName: 'SU', country: 'South Africa', continent: 'Africa', custom: false },
    { id: 'u_wits_za', name: 'University of the Witwatersrand', shortName: 'Wits', country: 'South Africa', continent: 'Africa', custom: false },
    { id: 'u_up_za', name: 'University of Pretoria', shortName: 'UP', country: 'South Africa', continent: 'Africa', custom: false },
    { id: 'u_uj_za', name: 'University of Johannesburg', shortName: 'UJ', country: 'South Africa', continent: 'Africa', custom: false },
    { id: 'u_lagos_ng', name: 'University of Lagos', shortName: 'UNILAG', country: 'Nigeria', continent: 'Africa', custom: false },
    { id: 'u_ibadan_ng', name: 'University of Ibadan', shortName: 'UI', country: 'Nigeria', continent: 'Africa', custom: false },
    { id: 'u_mak_ug', name: 'Makerere University', shortName: 'MAK', country: 'Uganda', continent: 'Africa', custom: false },
    { id: 'u_uon_ke', name: 'University of Nairobi', shortName: 'UoN', country: 'Kenya', continent: 'Africa', custom: false },
    { id: 'u_ghana_gh', name: 'University of Ghana', shortName: 'UG', country: 'Ghana', continent: 'Africa', custom: false },

    // EUROPE
    { id: 'u_oxford_uk', name: 'University of Oxford', shortName: 'Oxford', country: 'United Kingdom', continent: 'Europe', custom: false },
    { id: 'u_eth_ch', name: 'ETH Zurich', shortName: 'ETH', country: 'Switzerland', continent: 'Europe', custom: false },
    { id: 'u_imperial_uk', name: 'Imperial College London', shortName: 'Imperial', country: 'United Kingdom', continent: 'Europe', custom: false },
    { id: 'u_cambridge_uk', name: 'University of Cambridge', shortName: 'Cambridge', country: 'United Kingdom', continent: 'Europe', custom: false },
    { id: 'u_ucl_uk', name: 'UCL', shortName: 'UCL', country: 'United Kingdom', continent: 'Europe', custom: false },
    { id: 'u_epfl_ch', name: 'EPFL', shortName: 'EPFL', country: 'Switzerland', continent: 'Europe', custom: false },

    // ASIA
    { id: 'u_tsinghua_cn', name: 'Tsinghua University', shortName: 'Tsinghua', country: 'China', continent: 'Asia', custom: false },
    { id: 'u_peking_cn', name: 'Peking University', shortName: 'PKU', country: 'China', continent: 'Asia', custom: false },
    { id: 'u_nus_sg', name: 'National University of Singapore', shortName: 'NUS', country: 'Singapore', continent: 'Asia', custom: false },
    { id: 'u_ntu_sg', name: 'Nanyang Technological University', shortName: 'NTU', country: 'Singapore', continent: 'Asia', custom: false },
    { id: 'u_tokyo_jp', name: 'University of Tokyo', shortName: 'UTokyo', country: 'Japan', continent: 'Asia', custom: false },
    { id: 'u_hku_hk', name: 'University of Hong Kong', shortName: 'HKU', country: 'Hong Kong', continent: 'Asia', custom: false },
    { id: 'u_iitd_in', name: 'Indian Institute of Technology Delhi', shortName: 'IIT Delhi', country: 'India', continent: 'Asia', custom: false },
    { id: 'u_iisc_in', name: 'Indian Institute of Science', shortName: 'IISc', country: 'India', continent: 'Asia', custom: false },

    // NORTH AMERICA
    { id: 'u_mit_us', name: 'Massachusetts Institute of Technology', shortName: 'MIT', country: 'United States', continent: 'North America', custom: false },
    { id: 'u_harvard_us', name: 'Harvard University', shortName: 'Harvard', country: 'United States', continent: 'North America', custom: false },
    { id: 'u_stanford_us', name: 'Stanford University', shortName: 'Stanford', country: 'United States', continent: 'North America', custom: false },
    { id: 'u_princeton_us', name: 'Princeton University', shortName: 'Princeton', country: 'United States', continent: 'North America', custom: false },
    { id: 'u_yale_us', name: 'Yale University', shortName: 'Yale', country: 'United States', continent: 'North America', custom: false },
    { id: 'u_berkeley_us', name: 'University of California, Berkeley', shortName: 'Berkeley', country: 'United States', continent: 'North America', custom: false },
    { id: 'u_toronto_ca', name: 'University of Toronto', shortName: 'UofT', country: 'Canada', continent: 'North America', custom: false },
    { id: 'u_mcgill_ca', name: 'McGill University', shortName: 'McGill', country: 'Canada', continent: 'North America', custom: false },

    // SOUTH AMERICA
    { id: 'u_usp_br', name: 'Universidade de São Paulo', shortName: 'USP', country: 'Brazil', continent: 'South America', custom: false },
    { id: 'u_puc_cl', name: 'Pontificia Universidad Católica de Chile', shortName: 'UC', country: 'Chile', continent: 'South America', custom: false },
    { id: 'u_unicamp_br', name: 'Universidade Estadual de Campinas', shortName: 'UNICAMP', country: 'Brazil', continent: 'South America', custom: false },

    // OCEANIA
    { id: 'u_melbourne_au', name: 'University of Melbourne', shortName: 'UniMelb', country: 'Australia', continent: 'Oceania', custom: false },
    { id: 'u_sydney_au', name: 'University of Sydney', shortName: 'USYD', country: 'Australia', continent: 'Oceania', custom: false },
    { id: 'u_anu_au', name: 'Australian National University', shortName: 'ANU', country: 'Australia', continent: 'Oceania', custom: false },
    { id: 'u_unsw_au', name: 'UNSW Sydney', shortName: 'UNSW', country: 'Australia', continent: 'Oceania', custom: false },
    { id: 'u_monash_au', name: 'Monash University', shortName: 'Monash', country: 'Australia', continent: 'Oceania', custom: false },
    { id: 'u_uq_au', name: 'University of Queensland', shortName: 'UQ', country: 'Australia', continent: 'Oceania', custom: false },
    { id: 'u_auckland_nz', name: 'University of Auckland', shortName: 'UoA', country: 'New Zealand', continent: 'Oceania', custom: false }
];

function searchUniversities(query) {
    if (!query) return [];
    const lowerQuery = query.toLowerCase();
    // Combine built-in with user's custom universities from appState
    const all = [...globalUniversities, ...(window.appState?.universities || [])];
    return all.filter(u => 
        u.name.toLowerCase().includes(lowerQuery) || 
        (u.shortName && u.shortName.toLowerCase().includes(lowerQuery))
    );
}
