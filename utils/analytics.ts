import {track} from '@vercel/analytics/react';

// Home page tracking
export const trackQuickAccessLink = (linkName: string) => {
    track('home_quick_access_click', {linkName});
};

export const trackGenerateQuote = () => {
    track('home_generate_quote_click');
};

export const trackReceiveTip = () => {
    track('home_receive_tip_click');
};

export const trackHomePageVisit = () => {
    const startTime = Date.now();

    // Return a function to be called when leaving the page
    return () => {
        const endTime = Date.now();
        const timeSpentSeconds = Math.floor((endTime - startTime) / 1000);
        track('home_page_time', {timeSpentSeconds});
    };
};

// Temperament test tracking
export const trackTestStart = (userName: string) => {
    track('temperament_test_started', {userName});
};

export const trackTestCompletion = (results: any) => {
    track('temperament_test_completed', {
        primaryTemperament: results.primaryTemperament.name,
        secondaryTemperament: results.secondaryTemperament.name,
        testDuration: results.testDuration
    });
};

export const trackQuestionDropout = (questionIndex: number, questionText: string) => {
    track('temperament_test_question_dropout', {
        questionIndex,
        questionText
    });
};

export const trackPdfDownload = (userName: string, primaryTemperament: string) => {
    track('temperament_test_pdf_download', {
        userName,
        primaryTemperament
    });
};

export const trackTemperamentDistribution = (results: any) => {
    track('temperament_test_distribution', {
        sanguineo: results.temperamentPercentages.Sanguineo,
        colerico: results.temperamentPercentages.Colerico,
        melancolico: results.temperamentPercentages.Melancolico,
        fleumatico: results.temperamentPercentages.Fleumatico
    });
};

// About page tracking
export const trackSocialMediaClick = (platform: string) => {
    track('about_social_media_click', {platform});
};

// Projects page tracking
export const trackProjectClick = (projectName: string) => {
    track('projects_project_click', {projectName});
};