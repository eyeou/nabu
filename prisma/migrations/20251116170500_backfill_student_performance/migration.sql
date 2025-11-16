-- Backfill existing students with a derived performance level based on past assessments
WITH stats AS (
  SELECT
    "studentId",
    AVG(
      CASE
        WHEN "maxScore" > 0 THEN "overallScore" / NULLIF("maxScore", 0)
        ELSE NULL
      END
    ) AS avg_percent
  FROM "student_assessments"
  WHERE "overallScore" IS NOT NULL
    AND "maxScore" IS NOT NULL
    AND "maxScore" > 0
  GROUP BY "studentId"
)
UPDATE "students" AS s
SET "performanceLevel" = CASE
  WHEN stats.avg_percent >= 0.9 THEN 5
  WHEN stats.avg_percent >= 0.75 THEN 4
  WHEN stats.avg_percent >= 0.55 THEN 3
  WHEN stats.avg_percent >= 0.4 THEN 2
  WHEN stats.avg_percent IS NOT NULL THEN 1
  ELSE s."performanceLevel"
END
FROM stats
WHERE stats."studentId" = s.id;


