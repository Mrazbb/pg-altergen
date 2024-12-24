CREATE OR REPLACE VIEW "public"."view_reviews_info" AS
SELECT 
    m.id,                          
    m.userid,                      
    u.username,                 
    m.movieid,                     
    movie.title,                       
    m.reviewtext,                  
    m.rating,                      
    m.dtcreated                   
FROM "public"."tbl_review" m
    JOIN "public"."tbl_user" u ON m.userid = u.id
    JOIN "public"."tbl_movie" movie ON m.movieid = movie.id; 