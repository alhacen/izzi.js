const gulp = require('gulp');
const babel = require('gulp-babel');
const uglify = require('gulp-uglify');
var rename = require("gulp-rename");

gulp.task('minify', () => {
  return gulp.src('src/**/*.js')
    .pipe(babel())
    .pipe(rename("izzi.js"))
    .pipe(gulp.dest('dist'))
    .pipe(uglify())
    .pipe(rename("izzi.min.js"))
    .pipe(gulp.dest('dist'))

});
