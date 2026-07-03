-- Correct Khanittha (Cream) employee/card code so HIP raw code 48867
-- maps to the canonical employee_code 488-67.

UPDATE public.employees
SET employee_code = '488-67'
WHERE
    id = '31691fac-9fd0-4226-bb8e-2f82118f5032'
    AND employee_code = '436-62';
