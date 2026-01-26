import { FastifyInstance } from "fastify";
import { getAllSyllabi, getSyllabus, getGradeWeightSummary, matchSyllabusToCourse } from "../services/syllabus.js";
import type { SyllabusListResponse, SyllabusResponse } from "../types/syllabus.js";

export async function syllabusRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /syllabus - List all syllabi with grade weights
   */
  app.get("/syllabus", async (request, reply) => {
    const syllabi = await getAllSyllabi();
    const summary = await getGradeWeightSummary();
    
    const response: SyllabusListResponse = {
      syllabi,
      summary,
    };
    
    return response;
  });

  /**
   * GET /syllabus/weights - Just the grade weight summary (lighter response)
   */
  app.get("/syllabus/weights", async (request, reply) => {
    const summary = await getGradeWeightSummary();
    return { weights: summary };
  });

  /**
   * GET /syllabus/:course - Get a specific syllabus by slug or course name
   */
  app.get<{ Params: { course: string } }>("/syllabus/:course", async (request, reply) => {
    const { course } = request.params;
    const syllabus = await getSyllabus(course);
    
    if (!syllabus) {
      reply.code(404).send({
        error: "NotFound",
        message: `No syllabus found for course: ${course}`,
        availableCourses: (await getAllSyllabi()).map(s => s.slug),
      });
      return;
    }
    
    const response: SyllabusResponse = { syllabus };
    return response;
  });

  /**
   * POST /syllabus/match - Match a Canvas course name to a syllabus
   */
  app.post<{ Body: { courseName: string } }>("/syllabus/match", async (request, reply) => {
    const { courseName } = request.body;
    
    if (!courseName) {
      reply.code(400).send({
        error: "BadRequest",
        message: "courseName is required",
      });
      return;
    }
    
    const syllabus = await matchSyllabusToCourse(courseName);
    
    if (!syllabus) {
      return { matched: false, courseName };
    }
    
    return { matched: true, courseName, syllabus };
  });

  /**
   * POST /syllabus/impact - Calculate grade impact for an assignment
   * Useful for answering "how bad is this grade?"
   */
  app.post<{ 
    Body: { 
      courseName: string;
      category: string;
      score: number;
      maxScore: number;
      currentGrade?: number;
    } 
  }>("/syllabus/impact", async (request, reply) => {
    const { courseName, category, score, maxScore, currentGrade } = request.body;
    
    if (!courseName || !category || score === undefined || !maxScore) {
      reply.code(400).send({
        error: "BadRequest",
        message: "courseName, category, score, and maxScore are required",
      });
      return;
    }
    
    const syllabus = await matchSyllabusToCourse(courseName);
    
    if (!syllabus) {
      return {
        error: "No syllabus found",
        courseName,
        cannotCalculate: true,
      };
    }
    
    // Find the category weight
    const categoryWeight = syllabus.gradeWeights.find(
      w => w.category.toLowerCase().includes(category.toLowerCase()) ||
           category.toLowerCase().includes(w.category.toLowerCase())
    );
    
    if (!categoryWeight) {
      return {
        error: "Category not found in syllabus",
        category,
        availableCategories: syllabus.gradeWeights.map(w => w.category),
        cannotCalculate: true,
      };
    }
    
    const percentScore = (score / maxScore) * 100;
    const categoryWeightDecimal = categoryWeight.weight / 100;
    
    // Simplified impact calculation
    // This assumes the assignment is one of many in the category
    // Actual impact depends on number of assignments in category
    const estimatedImpact = {
      percentScore: Math.round(percentScore * 10) / 10,
      categoryWeight: categoryWeight.weight,
      categoryName: categoryWeight.category,
      maxPossibleImpact: categoryWeight.weight,
      notes: categoryWeight.notes,
      keyPolicies: syllabus.keyPolicies,
      interpretation: getInterpretation(percentScore, categoryWeight.weight, syllabus),
    };
    
    return {
      courseName: syllabus.course,
      ...estimatedImpact,
    };
  });
}

/**
 * Generate a human-readable interpretation of a grade
 */
function getInterpretation(
  percentScore: number, 
  categoryWeight: number,
  syllabus: { course: string; keyPolicies: Array<{ name: string; description: string }> }
): string {
  const interpretations: string[] = [];
  
  // Score interpretation
  if (percentScore >= 90) {
    interpretations.push(`Great score (${percentScore}%)!`);
  } else if (percentScore >= 80) {
    interpretations.push(`Solid score (${percentScore}%).`);
  } else if (percentScore >= 70) {
    interpretations.push(`Passing score (${percentScore}%), but room for improvement.`);
  } else if (percentScore >= 60) {
    interpretations.push(`Below average (${percentScore}%). Consider reviewing this material.`);
  } else {
    interpretations.push(`Low score (${percentScore}%). Look into retake or redo options.`);
  }
  
  // Weight context
  if (categoryWeight <= 15) {
    interpretations.push(`This category is only ${categoryWeight}% of the grade—limited impact.`);
  } else if (categoryWeight >= 40) {
    interpretations.push(`This category is ${categoryWeight}% of the grade—significant impact.`);
  }
  
  // Check for relevant policies
  const retakePolicy = syllabus.keyPolicies.find(p => 
    p.name.toLowerCase().includes("retake") || 
    p.name.toLowerCase().includes("redo") ||
    p.description.toLowerCase().includes("retake") ||
    p.description.toLowerCase().includes("redo")
  );
  
  if (retakePolicy && percentScore < 85) {
    interpretations.push(`Check retake/redo options: ${retakePolicy.description.slice(0, 100)}...`);
  }
  
  return interpretations.join(" ");
}
