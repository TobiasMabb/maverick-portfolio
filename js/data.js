/* =====================================================================
   PORTFOLIO CONTENT
   Edit this file to change what the site shows. You do not need to
   touch index.html or main.js to add a project, certificate, photo or link.

   PLACEHOLDERS
   - Any link with url: ''  shows as "Link coming soon" until you fill it in.
   - Any image with src: '' shows as a dashed "Coming soon" box until you add a path.
   Paths are relative to index.html, for example 'images/certificates/sui-2nd-place.jpg'.

   SUGGESTED FOLDERS
   images/certificates/       certificate photos or e-certificates (JPG, PNG, WEBP)
   images/projects/<id>/      screenshots for each project
   images/gallery/            graphic design and photography
   docs/                      PDFs and documents (resume, project documentation)
   ===================================================================== */

window.PORTFOLIO = {

  /* Resume button in the hero. Example: url: 'docs/resume.pdf' */
  resume: { url: '' },

  /* ---------- Work experience (About section) ---------- */
  experience: [
    {
      role: 'Gym Attendant / Fitness Coach',
      company: 'Island Punch Fitness',
      place: 'Kalikasan Homes, San Miguel, Puerto Princesa City',
      start: '2024',
      end: 'Present',
      bullets: [
        'Coached and guided members through workouts based on their fitness goals and individual needs.',
        'Provided basic fitness instructions and demonstrated exercises to help members improve their performance.',
        'Developed communication, interpersonal, and customer service skills through regular interaction with gym members.'
      ]
    }
  ],

  /* ---------- Achievements, certifications and training ----------
     Each item has one of three looks, depending on its images:

     1. A real picture  ->  images: [ { src: 'images/certificates/sui-2nd-place.jpg', caption: 'Certificate' } ]
        Shows a thumbnail. Selecting it opens the picture full size.
        Add more than one picture for front and back or several pages.

     2. Not added yet   ->  images: [ { src: '', caption: '...' } ]
        Shows a dashed "Coming soon" box. Use this when you plan to find the file.

     3. You do not have a copy  ->  images: []
        The item still shows, with no picture box. Nothing looks missing.

     To remove an item from the page completely, add  hidden: true  to it.
     (Delete the item or leave it in the file, either works.) */
  achievements: [
    {
      id: 'sui-2nd-place',
      title: '2nd Place, SUI Builders Palawan MVP Building',
      meta: 'Puerto Princesa City',
      year: '2025',
      images: [ { src: '', caption: '2nd Place certificate, SUI Builders Palawan MVP Building' } ]
    }
  ],

  training: [
    {
      id: 'sui-builders-program',
      title: 'Sui Builders Program, Palawan',
      meta: 'DICT MIMAROPA / Trabahong Digital / YGG Pilipinas',
      year: '2025',
      images: [ { src: '', caption: 'Certificate, Sui Builders Program, Palawan' } ]
    },
    {
      id: 'ict-work-immersion',
      title: 'ICT Work Immersion',
      meta: 'Yabytes Internet Cafe',
      year: '2022',
      images: [ { src: '', caption: 'Certificate, ICT Work Immersion at Yabytes Internet Cafe' } ]
    }
  ],

  /* ---------- Skills ---------- */
  skills: [
    { group: 'Languages',               items: ['Python', 'JavaScript', 'HTML/CSS', 'C++', 'SQL'] },
    { group: 'Frameworks and tools',    items: ['React', 'Django', 'Supabase', 'Firebase', 'Git'] },
    { group: 'Design and productivity', items: ['Figma', 'Canva', 'Excel'] },
    { group: 'Other',                   items: ['IoT / ESP32', 'QGIS', '3D Printing', 'Technical Writing'] }
  ],

  /* ---------- Project categories ----------
     Add a category here, then give projects that category id. */
  projectCategories: [
    { id: 'personal', label: 'Personal' },
    { id: 'client',   label: 'Client' },
    { id: 'school',   label: 'School' }
  ],

  /* ---------- Projects ----------
     category: one of the ids above.
     links:        url '' = "Link coming soon".  Delete a link you will never have.
     screenshots:  src '' = dashed placeholder. Add as many as you like.
     docs:         type is a short label such as 'PDF' or 'DOCX'.
     details:      optional longer text shown under the summary (leave '' to hide). */
  projects: [
    {
      id: 'island-punch-gym-system',
      title: 'Gym Management System for Island Punch Fitness',
      category: 'client',
      tag: 'Web App',
      year: '2026',
      summary: 'A mobile-friendly gym management app that replaces Excel and paper with member, client, and walk-in tracking, installment payments, and automated sales reports.',
      details: '',
      stack: ['Next.js', 'React', 'Tailwind CSS', 'Supabase', 'jsPDF', 'PostgreSQL'],
      links: [
        { label: 'Live system', url: '' },
        { label: 'Source code', url: '' }
      ],
      screenshots: [
        { src: '', caption: 'Screenshot 1' },
        { src: '', caption: 'Screenshot 2' },
        { src: '', caption: 'Screenshot 3' }
      ],
      docs: [ { label: 'Project documentation', type: 'PDF', url: '' } ]
    },
    {
      id: 'psu-sportstrack',
      title: 'PSU SportsTrack',
      category: 'school',
      tag: 'Capstone',
      year: '2026',
      summary: 'Web-based tournament management system for PSU\'s inter-campus sports events. Features real-time score updates and role-based access for admins, coaches, and players.',
      details: '',
      stack: ['React', 'Supabase Realtime', 'Tailwind CSS'],
      links: [
        { label: 'Live system', url: '' },
        { label: 'Source code', url: '' }
      ],
      screenshots: [
        { src: '', caption: 'Screenshot 1' },
        { src: '', caption: 'Screenshot 2' },
        { src: '', caption: 'Screenshot 3' }
      ],
      docs: [ { label: 'Project documentation', type: 'PDF', url: '' } ]
    },
    {
      id: 'drop-camera-trigger',
      title: 'D.R.O.P. Remote Camera Trigger',
      category: 'school',
      tag: 'IoT',
      year: '2026',
      summary: 'ESP32-S3 based remote camera trigger with Firebase Realtime Database and Cloudinary integration, Discord webhook notifications, and canvas-based timestamp watermarking.',
      details: '',
      stack: ['ESP32-S3', 'Firebase', 'Cloudinary', 'C++'],
      links: [
        { label: 'Live system', url: '' },
        { label: 'Source code', url: '' }
      ],
      screenshots: [
        { src: '', caption: 'Screenshot 1' },
        { src: '', caption: 'Screenshot 2' },
        { src: '', caption: 'Screenshot 3' }
      ],
      docs: [ { label: 'Project documentation', type: 'PDF', url: '' } ]
    },
    {
      id: 'tourist-gis-mapping',
      title: 'Mapping and Spatial Analysis of Tourist Attractions in Puerto Princesa City',
      category: 'school',
      tag: 'GIS',
      year: '2026',
      summary: 'Spatial analysis of tourist spot accessibility in Puerto Princesa City using QGIS: distance classification, buffer zone generation, road network routing, and a formatted map panel layout.',
      details: '',
      stack: ['QGIS', 'OpenStreetMap', 'QuickOSM', 'Network Analysis', 'Graduated Symbology', 'EPSG:32651'],
      links: [
        { label: 'Project files', url: '' }
      ],
      screenshots: [
        { src: '', caption: 'Map layout 1' },
        { src: '', caption: 'Map layout 2' },
        { src: '', caption: 'Map layout 3' }
      ],
      docs: [ { label: 'Project documentation', type: 'PDF', url: '' } ]
    },
    {
      id: 'synco',
      title: 'Synco, The Ultimate Musician\'s Companion',
      category: 'school',
      tag: 'App-Dev',
      year: '2026',
      summary: 'A full-stack musician\'s companion app for accessing chords, lyrics, and key transposition, with a built-in metronome, YouTube song import, and set-list management.',
      details: '',
      stack: ['Django', 'HTML', 'CSS', 'YouTube API', 'Metronome API', 'Lyrics & Chords API'],
      links: [
        { label: 'Live system', url: '' },
        { label: 'Source code', url: '' }
      ],
      screenshots: [
        { src: '', caption: 'Screenshot 1' },
        { src: '', caption: 'Screenshot 2' },
        { src: '', caption: 'Screenshot 3' }
      ],
      docs: [ { label: 'Project documentation', type: 'PDF', url: '' } ]
    }
  ],

  /* ---------- Gallery: graphic design and photography ----------
     category: 'graphic' or 'photo'.
     src:      path to the image, e.g. 'images/gallery/poster-01.jpg'. '' = "Coming soon" box.
     title:    short name shown on hover and in the viewer.
     caption:  optional one line about the piece (tool, client, camera, place).
     ratio:    only used while src is '' so the placeholder has a realistic shape,
               e.g. '4 / 5' (portrait), '4 / 3' (landscape), '1 / 1' (square).
               Real images use their own shape.
     To add a piece, copy one block, change the values, and save. */
  gallery: {
    categories: [
      { id: 'graphic', label: 'Graphic design' },
      { id: 'photo',   label: 'Photography' }
    ],
    items: [
      { id: 'gd-1', category: 'graphic', title: 'Graphic design 1', caption: '', src: '', ratio: '4 / 5' },
      { id: 'gd-2', category: 'graphic', title: 'Graphic design 2', caption: '', src: '', ratio: '1 / 1' },
      { id: 'gd-3', category: 'graphic', title: 'Graphic design 3', caption: '', src: '', ratio: '4 / 3' },
      { id: 'ph-1', category: 'photo',   title: 'Photograph 1',     caption: '', src: '', ratio: '4 / 3' },
      { id: 'ph-2', category: 'photo',   title: 'Photograph 2',     caption: '', src: '', ratio: '4 / 5' },
      { id: 'ph-3', category: 'photo',   title: 'Photograph 3',     caption: '', src: '', ratio: '1 / 1' }
    ]
  },

  /* ---------- Socials and contact ----------
     A social shows as live only when BOTH value and href are filled in.
     Until then it shows "Link coming soon".
     icon: mail, phone, pin, code, facebook, instagram, linkedin
     copy: true adds a Copy button.  info: true shows plain text with no link. */
  socials: [
    { id: 'email',     label: 'Email',     icon: 'mail',      value: 'mabbytorres03@gmail.com', href: 'mailto:mabbytorres03@gmail.com', copy: true },
    { id: 'phone',     label: 'Phone',     icon: 'phone',     value: '0916 363 8417',           href: 'tel:09163638417',               copy: true },
    { id: 'github',    label: 'GitHub',    icon: 'code',      value: 'github.com/TobiasMabb',   href: 'https://github.com/TobiasMabb' },
    { id: 'linkedin',  label: 'LinkedIn',  icon: 'linkedin',  value: '', href: '' },
    { id: 'facebook',  label: 'Facebook',  icon: 'facebook',  value: '', href: '' },
    { id: 'instagram', label: 'Instagram', icon: 'instagram', value: '', href: '' },
    { id: 'location',  label: 'Location',  icon: 'pin',       value: 'Puerto Princesa, Palawan', href: '', info: true }
  ]
};