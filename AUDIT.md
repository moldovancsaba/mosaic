# Project Audit - InBrowserVideoComposer

**Date**: 2025-12-18  
**Status**: Issues Found - Documentation misaligned with code

## Critical Issues

### 1. MongoDB Driver Inconsistency ⚠️

**Documentation Says**: "MongoDB Atlas via Mongoose"  
**Reality**: API routes use MongoDB native driver directly

**Files Affected**:
- `app/api/project/route.ts` - Uses native MongoDB driver (`MongoClient`, `ObjectId`)
- `models/Project.ts` - Defines Mongoose model that is **never used**
- `lib/mongodb.ts` - Exports Mongoose connection that is **never used**

**Impact**: Confusing codebase with unused Mongoose dependencies

**Recommendation**: Choose one approach:
- **Option A** (Cleaner): Remove Mongoose entirely, update docs to say "MongoDB native driver"
- **Option B** (More structured): Refactor API routes to use Mongoose models

---

### 2. Missing API Route Structure 🔍

**Documentation Says**: API route at `app/api/project/[id]/route.ts` for GET/PUT/DELETE by ID  
**Reality**: No such file exists. All operations are in `app/api/project/route.ts`

**Impact**: Documentation references non-existent file structure

**Recommendation**: Update documentation to reflect actual single-file API structure

---

### 3. Transition Direction Default Mismatch ⚠️

**Mongoose Model** (`models/Project.ts` line 19): `default: 'right'`  
**API Route** (`app/api/project/route.ts` line 68): `direction: 'left' as const`

**Impact**: New projects created via API have different defaults than Mongoose model expects

**Recommendation**: Standardize on one default (suggest 'right' for typical left-to-right reading)

---

### 4. Import Path Inconsistencies 📦

**Editor Page** (`app/editor/page.tsx` line 5):
```typescript
import { renderStage1Frame, renderFinalFrame } from '../../src/canvas/renderFrame'
```

**Should Use Path Alias**:
```typescript
import { renderStage1Frame, renderFinalFrame } from '@/canvas/renderFrame'
```

**Impact**: Inconsistent import patterns across codebase

---

## Documentation Errors

### 5. M6 Status Incorrect ✅

**README.md** says: "- [ ] **M6**: Optional MP4 Export (ffmpeg.wasm integration)"  
**PROJECT_STATUS.md** says: "M6: Optional MP4 Export (Future Enhancement)"

**Reality**: M6 is **FULLY IMPLEMENTED**
- `src/media/transcodeMp4.ts` - Complete ffmpeg.wasm integration
- MP4 and MOV export fully functional in editor UI
- Progress tracking, error handling, all complete

**Recommendation**: Update all docs to mark M6 as complete

---

### 6. Milestone M4 Incomplete ⚠️

**README.md** line 118 says: "- [ ] **M4**: Stage-2 Composition (canvas integration needed)"  
**PROJECT_STATUS.md** says: "M4: Stage-2 Composition ✅ - [x] Frame2 upload..."

**Reality**: M4 IS complete (Stage-2 rendering works in editor)

**Recommendation**: Mark M4 as complete in README

---

### 7. Missing File Reference 🔍

**Documentation references**: `src/lib/featureDetect.ts`  
**Reality**: File does not exist

**Impact**: Documentation references non-existent utility file

**Recommendation**: Either create the file or remove from documentation

---

## Minor Issues

### 8. Canvas Rendering Architecture Not Fully Documented

**Current Documentation**: Describes two-stage pipeline but doesn't explain the composite image approach

**Reality**: 
- Stage 1 creates composite images (image + Frame 1) for each transition frame
- Transitions are applied to the composite images, not raw images
- This is a unique implementation detail not documented

**Recommendation**: Update WARP.md with "Composite Image Pattern" section

---

### 9. Default Transition Values Mismatch

Multiple default values across different files:

| Property | Mongoose Model | API Route | UI Default |
|----------|---------------|-----------|------------|
| direction | 'right' | 'left' | 'right' (HTML select) |
| durationMs | 500 | 500 | ✓ Match |

**Recommendation**: Standardize all defaults to match

---

## Files Needing Updates

### Code Files
- [ ] `app/api/project/route.ts` - Fix transition direction default
- [ ] `app/editor/page.tsx` - Fix import paths to use aliases
- [ ] `models/Project.ts` - Remove if not using Mongoose, or refactor API to use it
- [ ] `lib/mongodb.ts` - Remove if not using Mongoose

### Documentation Files
- [ ] `WARP.md` - Update architecture section, fix API structure, mark M6 complete
- [ ] `README.md` - Mark M4 and M6 complete, update status
- [ ] `PROJECT_STATUS.md` - Mark M6 complete, update all milestone statuses
- [ ] `PROJECT_SPEC.md` - May need minor updates to reflect actual implementation

---

## Recommendations

### Immediate Actions (High Priority)

1. **Choose MongoDB approach** - Mongoose or native driver, not both
2. **Fix transition defaults** - Standardize across all files
3. **Update milestone statuses** - M4, M5, M6 are all complete

### Medium Priority

4. **Fix import paths** - Use TypeScript path aliases consistently
5. **Update WARP.md** - Reflect actual code structure
6. **Create featureDetect.ts** or remove references

### Low Priority

7. **Add composite image pattern docs** - Document unique rendering approach
8. **Add architecture diagrams** - Visual representation of two-stage pipeline

---

## Testing Recommendations

After fixes, verify:
- [ ] Can create new project
- [ ] Can upload images and reorder them
- [ ] Can upload Frame 1 and Frame 2
- [ ] Preview works correctly
- [ ] WebM export works
- [ ] MP4/MOV conversion works
- [ ] All MongoDB operations work correctly
- [ ] TypeScript compilation has no errors

---

## Summary

**Total Issues Found**: 9  
**Critical**: 4  
**Documentation Errors**: 4  
**Minor**: 1

The codebase is **functionally complete** but suffers from documentation drift and inconsistent patterns. The main issue is choosing between Mongoose and native MongoDB driver approach.
