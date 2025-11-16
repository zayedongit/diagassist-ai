-- Create trigger to automatically assign admin role when phone number matches
CREATE TRIGGER trigger_auto_assign_admin_role
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_admin_role();