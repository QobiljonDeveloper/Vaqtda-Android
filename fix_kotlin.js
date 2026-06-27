const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/asus/Desktop/booking-mobile/node_modules/react-native-yamap/android/src/main/java/ru/vvdev/yamap';

function fixFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // 2. Fix the Return type mismatch: expected 'MutableMap<String, Any>?', actual 'Map<String, Any>'
    if (content.includes('MutableMap<String, Any>?')) {
        content = content.replace(/MutableMap<String, Any>\?/g, 'Map<String, Any>?');
        changed = true;
    }
    if (content.includes('MutableMap<String, Int>?')) {
        content = content.replace(/MutableMap<String, Int>\?/g, 'Map<String, Int>?');
        changed = true;
    }

    // 3 & 4. Fix ArrayList and String type mismatches + Add non-null assertions
    if (filePath.endsWith('YamapViewManager.kt') || filePath.endsWith('ClusteredYamapViewManager.kt')) {
        content = content.replace(/val points = ArrayList<Point\?>\(\)/g, 'val points = ArrayList<Point>()');
        content = content.replace(/val vehicles = ArrayList<String>\(\)/g, 'val vehicles = ArrayList<String>()');
        
        // args!!.getDouble(1) etc.
        content = content.replace(/args\.getDouble\(/g, 'args!!.getDouble(');
        content = content.replace(/args\.getInt\(/g, 'args!!.getInt(');
        content = content.replace(/args\.getBoolean\(/g, 'args!!.getBoolean(');
        content = content.replace(/args\.getString\(/g, 'args!!.getString(');
        content = content.replace(/args\.getArray\(/g, 'args!!.getArray(');

        // fixing findRoutes
        content = content.replace(/vehicles\.add\(jsVehicles\.getString\(i\)\)/g, 'jsVehicles!!.getString(i)?.let { vehicles.add(it) }');

        changed = true;
    }

    if (changed) {
        fs.writeFileSync(filePath, content);
    }
}

// apply to ViewManagers
fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('Manager.kt')) {
        fixFile(path.join(dir, file));
    }
});

// 5. Fix safe call errors in view/YamapView.kt
const yamapViewPath = path.join(dir, 'view', 'YamapView.kt');
if (fs.existsSync(yamapViewPath)) {
    let content = fs.readFileSync(yamapViewPath, 'utf8');
    
    // Fix: val child = getChildAt(index) as ReactMapObject ?: return
    content = content.replace(/as ReactMapObject \?: return/g, 'as? ReactMapObject ?: return');

    // Any other safe call on non-null receiver or non-null assertions on non-null
    // In kotlin, `point!!` where `point` is already `Point` causes an error.
    // Let's check where `!!` is used.
    // In `YamapView.kt`: `_points.add(RequestPoint(point!!, RequestPointType.WAYPOINT, null, null))`
    // If we changed `ArrayList<Point?>` to `ArrayList<Point>`, then `point` is `Point`. So `point!!` is an error.
    // BUT we didn't change YamapView.kt's signature for findRoutes because `ClusteredYamapViewManager` and `YamapViewManager` just pass `ArrayList<Point>`.
    // Wait, in `YamapView.kt`, `fun findRoutes(points: ArrayList<Point?>, ...)`
    // If I change it to `ArrayList<Point>`, I should fix YamapView.kt as well.
    content = content.replace(/fun findRoutes\(points: ArrayList<Point\?>, vehicles: ArrayList<String>, id: String\?\)/g, 'fun findRoutes(points: ArrayList<Point>, vehicles: ArrayList<String>, id: String?)');
    content = content.replace(/fun calculateBoundingBox\(points: ArrayList<Point\?>\)/g, 'fun calculateBoundingBox(points: ArrayList<Point>)');
    content = content.replace(/fun fitMarkers\(points: ArrayList<Point\?>\)/g, 'fun fitMarkers(points: ArrayList<Point>)');
    
    // Now if points is ArrayList<Point>, we need to remove `!!` when accessing it
    content = content.replace(/point\!\!/g, 'point');
    content = content.replace(/points\[0\]\!\!/g, 'points[0]');
    content = content.replace(/points\[i\]\!\!/g, 'points[i]');

    // Remove !! from nightMode!! if nightMode is not nullable?
    // fun setNightMode(nightMode: Boolean?) { ... nightMode!! } - this is fine.

    fs.writeFileSync(yamapViewPath, content);
}
