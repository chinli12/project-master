const fs = require('fs');
const path = require('path');

// Files to modernize
const filesToModernize = [
  'app/(tabs)/community.tsx',
  'app/(auth)/forgot-password.tsx',
  'app/(tabs)/discover.tsx',
  'app/(tabs)/index.tsx',
  'app/chat/[id].tsx',
  'app/(tabs)/planner.tsx',
  'app/chats.tsx',
  'app/(tabs)/profile.tsx',
  'app/create-event.tsx',
  'app/create-post.tsx',
  'app/create-group.tsx',
  'app/event-details.tsx',
  'app/directions.tsx',
  'app/group-details.tsx',
  'app/place/[id].tsx',
  'app/post-details.tsx',
  'app/reels.tsx',
  'app/trivia.tsx',
  'app/user-profile.tsx'
];

function modernizeFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Check if file needs modernization
    if (!content.includes('Alert.alert') && !content.includes('alert(')) {
      console.log(`Skipping ${filePath} - no alerts found`);
      return;
    }

    // Add ModernAlert import if not present
    if (!content.includes('ModernAlert')) {
      // Find the imports section
      const importRegex = /import.*from.*;/g;
      const imports = content.match(importRegex) || [];
      
      if (imports.length > 0) {
        // Add after the last import
        const lastImport = imports[imports.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport);
        const insertIndex = lastImportIndex + lastImport.length;
        
        content = content.slice(0, insertIndex) + 
                  '\nimport { ModernAlert } from \'@/utils/modernAlert\';' + 
                  content.slice(insertIndex);
        modified = true;
      }
    }

    // Remove Alert import if it exists
    content = content.replace(/,\s*Alert\s*,/g, ',');
    content = content.replace(/Alert\s*,/g, '');
    content = content.replace(/,\s*Alert/g, '');
    content = content.replace(/{\s*Alert\s*}/g, '{}');
    content = content.replace(/import\s*{\s*}\s*from\s*['"]react-native['"];?\n?/g, '');

    // Replace Alert.alert patterns
    const alertPatterns = [
      // Simple alerts
      {
        pattern: /Alert\.alert\(\s*['"`](Error|Failed|Fail)[^'"`]*['"`]\s*,\s*['"`]([^'"`]*)['"`]\s*\);?/g,
        replacement: "ModernAlert.error('$1', '$2');"
      },
      {
        pattern: /Alert\.alert\(\s*['"`](Success|Created|Saved)[^'"`]*['"`]\s*,\s*['"`]([^'"`]*)['"`]\s*\);?/g,
        replacement: "ModernAlert.success('$1', '$2');"
      },
      {
        pattern: /Alert\.alert\(\s*['"`](Warning|Permission)[^'"`]*['"`]\s*,\s*['"`]([^'"`]*)['"`]\s*\);?/g,
        replacement: "ModernAlert.warning('$1', '$2');"
      },
      {
        pattern: /Alert\.alert\(\s*['"`]([^'"`]*)['"`]\s*,\s*['"`]([^'"`]*)['"`]\s*\);?/g,
        replacement: "ModernAlert.info('$1', '$2');"
      },
      // Single parameter alerts
      {
        pattern: /Alert\.alert\(\s*['"`](Error|Failed|Fail)[^'"`]*['"`]\s*\);?/g,
        replacement: "ModernAlert.error('$1');"
      },
      {
        pattern: /Alert\.alert\(\s*['"`](Success|Created|Saved)[^'"`]*['"`]\s*\);?/g,
        replacement: "ModernAlert.success('$1');"
      },
      {
        pattern: /Alert\.alert\(\s*['"`]([^'"`]*)['"`]\s*\);?/g,
        replacement: "ModernAlert.info('$1');"
      }
    ];

    alertPatterns.forEach(({ pattern, replacement }) => {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        modified = true;
      }
    });

    // Handle complex Alert.alert patterns with buttons
    const complexAlertPattern = /Alert\.alert\(\s*['"`]([^'"`]*)['"`]\s*,\s*['"`]([^'"`]*)['"`]\s*,\s*\[\s*{\s*text:\s*['"`]([^'"`]*)['"`]\s*,\s*onPress:\s*\(\)\s*=>\s*([^}]*)\s*}\s*\]\s*\);?/g;
    
    content = content.replace(complexAlertPattern, (match, title, message, buttonText, onPress) => {
      const titleLower = title.toLowerCase();
      let alertType = 'info';
      
      if (titleLower.includes('error') || titleLower.includes('failed')) {
        alertType = 'error';
      } else if (titleLower.includes('success') || titleLower.includes('created')) {
        alertType = 'success';
      } else if (titleLower.includes('warning') || titleLower.includes('permission')) {
        alertType = 'warning';
      }
      
      modified = true;
      return `ModernAlert.${alertType}('${title}', '${message}', () => ${onPress.trim()});`;
    });

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Modernized ${filePath}`);
    } else {
      console.log(`ℹ️  No changes needed for ${filePath}`);
    }

  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

// Run the modernization
console.log('🚀 Starting alert modernization...\n');

filesToModernize.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    modernizeFile(fullPath);
  } else {
    console.log(`⚠️  File not found: ${file}`);
  }
});

console.log('\n✨ Alert modernization complete!');
